'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from "next-auth/react";
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import AllowanceSelector from '@/src/features/trip/components/AllowanceSelector';
import { getAllowances, AllowanceMaster } from '@/src/features/allowance/api/allowanceApi';
import { checkAllowanceValid } from '@/src/utils/checkAllowanceValid';
import { errorMessages } from '@/src/utils/messages';
import { EXPENSE_TYPES, TRANSPORT_MODE_OPTIONS, Enum_PRE_APPLY_STATUS, PRE_APPLY_STATUS, ExpenseItem, TripApplyFormValues, APPROVAL_HISTORY_STATUS, TripPreApplyDetail } from '@/src/features/trip/types';
import { fetchFareAmount, getApproversName } from '@/src/features/trip/api/tripCommonApi';
import { getApproval } from "@/src/features/approval/api/approvalApi";
import { ApprovalStepResponse } from "@/src/features/approval/types";
import { STEP_TYPES } from "@/src/features/approval/types";
import { POSITIONS } from '@/src/features/user/types';
import { formatDatetime } from '@/src//utils/date';

type Mode = 'applicant_view_only' | 'applicant_edit' | 'approver' | 'special_department_view' | 'checker';

type TripApplyFormProps = {
  initialData?: Partial<TripPreApplyDetail>;
  onSubmit: (data: TripApplyFormValues) => Promise<void>;
  submitLabel?: string;

  mode?: Mode;
  isUserTurn?: boolean;

  onBack?: () => void;
  onApprove?: (comment: string) => Promise<void>;
  onReject?: (comment: string) => Promise<void>;
  onConfirm?: (comment: string) => Promise<void>;
};

export default function TripPreApplyForm({
  initialData,
  onSubmit,
  submitLabel = '申請',
  isUserTurn,
  mode,
  onBack,
  onApprove,
  onReject,
  onConfirm,
}: TripApplyFormProps) {
  // 申請基本情報
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [startDate, setStartDate] = useState(initialData?.start_date ?? '');
  const [startTime, setStartTime] = useState(initialData?.start_time ?? '');
  const [endDate, setEndDate] = useState(initialData?.end_date ?? '');
  const [endTime, setEndTime] = useState(initialData?.end_time ?? '');
  const [destination, setDestination] = useState(initialData?.destination ?? '');
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialData?.expenses ?? []);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStepResponse[]>([]);
  const { data: session, status } = useSession();
  const [approvers, setApprovers] = useState<Record<number, string>>({});
  const [allowanceMasters, setAllowanceMasters] = useState<AllowanceMaster[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'confirm' | null>(null);
  const [modalComment, setModalComment] = useState('');

  const POSITION_LABELS = Object.fromEntries(POSITIONS.map(p => [p.value, p.label]));

  // コメントエラーチェック用
  const [commentError, setCommentError] = useState('');

  // 申請詳細データを親から props などで取得している想定
  const applyStatus = initialData?.status;

  // 申請データの承認履歴配列を取得
  const approval_histories = initialData?.approval_histories ?? [];

  // 未処理（承認待ち）履歴を探す
  const latestApprovalHistory = approval_histories.find(
    (his) => his.status === APPROVAL_HISTORY_STATUS.Pending
  );

  // 承認待ちの状態かどうか判定
  const isPending = applyStatus === Enum_PRE_APPLY_STATUS.Pending;

  const isEditable = mode === 'applicant_edit';
  const isApprover = mode === 'approver';
  const isChecker = mode === 'checker';
  const isRejectedAndOwner =
    applyStatus === Enum_PRE_APPLY_STATUS.Rejected &&
    session?.user?.id === initialData?.request_user_id;

  const isEditableFinal = isEditable || isRejectedAndOwner;

  // 承認・却下ボタン表示判定
  const showApproveRejectButtons = isApprover && isPending && isUserTurn;

  // 確認ボタン表示設定判定
  const showConfirmButton = isChecker && isUserTurn;

  // 駅検索モーダル関連
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [modalExpenseIndex, setModalExpenseIndex] = useState<number | null>(null);
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [stationSuggestionsFrom, setStationSuggestionsFrom] = useState<string[]>([]);
  const [stationSuggestionsTo, setStationSuggestionsTo] = useState<string[]>([]);
  const [stationLoadingFrom, setStationLoadingFrom] = useState(false);
  const [stationLoadingTo, setStationLoadingTo] = useState(false);

  // エラー
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof TripApplyFormValues, string>>>({});

  // 明細追加・削除・編集
  const addExpenseItem = () => {
    setExpenses([
      ...expenses,
      {
        expense_type: 1,
        transport_mode: 1,
        amount: 0,
        description: '',
        departure_place: '',
        arrival_place: ''
      },
    ]);
  };

  const updateExpenseItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const newExpenses = [...expenses];
    (newExpenses[index] as any)[field] = value;

    // typeが切り替わった場合は関連フィールド初期化
    if (field === 'expense_type') {
      if (value === 1) { // 交通費
        newExpenses[index].transport_mode = 1;
        newExpenses[index].departure_place = '';
        newExpenses[index].arrival_place = '';
        newExpenses[index].description = '';
      } else {
        delete newExpenses[index].transport_mode;
        newExpenses[index].departure_place = '';
        newExpenses[index].arrival_place = '';
        newExpenses[index].description = '';
      }
    }
    setExpenses(newExpenses);
  };

  const removeExpenseItem = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  // TODO:駅検索による運賃取得はまだできてない
  const openRouteModal = (index: number) => {
    setModalExpenseIndex(index);
    setRouteFrom('');
    setRouteTo('');
    setShowRouteModal(true);
  };

  const closeRouteModal = () => {
    setShowRouteModal(false);
    setRouteFrom('');
    setRouteTo('');
  };

  const handleRouteSelect = async () => {
    if (modalExpenseIndex === null) return;
    try {
      const amount = await fetchFareAmount(routeFrom, routeTo);
      const newExpenses = [...expenses];
      newExpenses[modalExpenseIndex] = {
        ...newExpenses[modalExpenseIndex],
        departure_place: routeFrom,
        arrival_place: routeTo,
        description: `${routeFrom}→${routeTo}`,
        amount,
      };
      setExpenses(newExpenses);
      closeRouteModal();
    } catch (err) {
      alert("金額の取得に失敗しました");
      console.error(err);
    }
  };

  // 合計金額
  const totalAmount = useMemo(
    () => expenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0),
    [expenses]
  );

  // 承認ボタン押下時
  const handleApproveClick = () => {
    setModalType('approve');
    setModalComment('');
    setCommentError('');
    setModalOpen(true);
  };

  // 却下ボタン押下時
  const handleRejectClick = () => {
    setModalType('reject');
    setModalComment('');
    setCommentError('');
    setModalOpen(true);
  };

  // 確認ボタン押下時
  const handleConfirmClick = () => {
    setModalType('confirm');
    setModalComment('');
    setCommentError('');
    setModalOpen(true);
  };

  // モーダルキャンセル
  const handleModalCancel = () => {
    setModalOpen(false);
  };

  // モーダル確定（承認 or 却下）
  const handleModalSubmit = async () => {
    // コメント100文字以内のバリデーション
    if (modalComment.length > 100) {
      setCommentError('コメントは100文字以内で入力してください');
      return;
    }

    try {
      if (modalType === 'approve' && onApprove) {
        await onApprove(modalComment);
      } else if (modalType === 'reject' && onReject) {
        await onReject(modalComment);
      } else if (modalType === 'confirm' && onConfirm) {
        await onConfirm(modalComment);
      }
      setModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  // バリデーション
  const validate = () => {
    const newErrors: typeof errors = {};
    if (!startDate) newErrors.start_date = errorMessages.required('出発日');
    if (!startTime) newErrors.start_time = errorMessages.required('出発時間');
    if (!endDate) newErrors.end_date = errorMessages.required('到着日');
    if (!endTime) newErrors.end_time = errorMessages.required('到着時間');
    if (!destination.trim()) newErrors.destination = errorMessages.required('出張場所');
    if (expenses.length === 0) newErrors.expenses = errorMessages.required('費用明細');

    expenses.forEach((exp, i) => {
      if (!exp.expense_type) newErrors.expenses = errorMessages.required('費用種別');
      const amountStr = exp.amountText ?? exp.amount.toString();
      if (!amountStr || amountStr.trim() === '') {
        newErrors.expenses = errorMessages.required('金額');
      } else if (!/^\d+$/.test(amountStr)) {
        newErrors.expenses = errorMessages.positiveInteger('金額');
      } else if (Number(amountStr) < 1) {
        newErrors.expenses = errorMessages.minAmount('金額', 1);
      }
      if (exp.expense_type === 1 && (!exp.departure_place || !exp.arrival_place)) newErrors.expenses = '交通費は出発地・到着地を入力してください';
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);

    if (!session?.user?.position) {
      setError('ログイン情報が取得できません');
      return;
    }

    const position = session.user.position;
    const approvalRoutes: { [key: number]: string | undefined } = {
      1: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_1,
      2: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_2,
      3: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_3,
      4: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_4,
    };

    const routeIdStr = approvalRoutes[position];
    if (!routeIdStr) {
      setError(`承認ルートが見つかりません`);
      return;
    }

    const approvalRouteId = parseInt(routeIdStr);

    const allowances = expenses
      .filter(exp => exp.expense_type === 3 && exp.allowance_id)
      .map(exp => ({
        allowance_master_id: exp.allowance_id!,
        amount: exp.amount,
        description: exp.description,
      }));

    const formData: TripApplyFormValues = {
      title,
      request_type: 1,
      status: 1,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      destination,
      approval_route_master_id: approvalRouteId,
      expenses: expenses.filter(exp => exp.expense_type !== 3), // 手当以外
      allowances,
    };
    try {
      if (onSubmit) {
        await onSubmit(formData);
      }
    } catch (err) {
      setError(`${submitLabel}に失敗しました`);
    }
  };

  useEffect(() => {
    async function fetchMasters() {
      try {
        const res = await getAllowances({ is_active: 'true' });
        setAllowanceMasters(res);
      } catch (e) {
        console.error('手当マスタの取得に失敗しました', e);
      }
    }
    fetchMasters();
  }, []);

  useEffect(() => {
    if (allowanceMasters.length === 0) {
      // まだマスタ未取得ならフィルター処理しない
      return;
    }

    setExpenses(prevExpenses =>
      prevExpenses.filter(exp => {
        if (exp.expense_type === 3) {
          const allowance = allowanceMasters.find(a => a.id === exp.allowance_id);
          if (!allowance) return false;
          return checkAllowanceValid(allowance, startDate, endDate, startTime, endTime);
        }
        return true;
      })
    );
  }, [startDate, endDate, startTime, endTime, allowanceMasters]);

  useEffect(() => {
    const fetchApprovalSteps = async () => {
      let routeId: number | undefined;

      const approvalRoutes: { [key: number]: string | undefined } = {
        1: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_1,
        2: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_2,
        3: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_3,
        4: process.env.NEXT_PUBLIC_APPROVAL_ROUTE_FOR_POSITION_4,
      };
      // (1) 申請詳細・再申請画面(business_trip_requests.request_user_idから取得
      if (initialData?.request_user) {
        const position = initialData?.request_user.position;
        const routeIdStr = approvalRoutes[position];
        if (!routeIdStr) {
          console.warn("承認ルートが設定されていません:", position);
          return;
        }
        routeId = parseInt(routeIdStr, 10);
      }
      // (2) 新規申請画面(ログインユーザーの役職から決定)
      else if (session?.user?.position) {
        const position = session.user.position;
        const routeIdStr = approvalRoutes[position];
        if (!routeIdStr) {
          console.warn("承認ルートが設定されていません:", position);
          return;
        }
        routeId = parseInt(routeIdStr, 10);
      }

      if (!routeId) {
        console.warn("承認ルートが決められませんでした");
        return;
      }

      try {
        const route = await getApproval(routeId);
        setApprovalSteps(route.steps);
      } catch (err) {
        console.error("承認ルートの取得に失敗しました", err);
      }
    };

    if (status === "authenticated") {
      fetchApprovalSteps();
    }
  }, [initialData?.approval_route_master_id, session, status]);

  useEffect(() => {
    const fetchApprovers = async () => {
      try {
        if (initialData?.request_user) {
          // (1) 申請詳細・再申請画面(business_trip_requests.request_user_idから承認ルートの氏名取得
          const approversJson = await getApproversName(initialData.request_user.department);
          setApprovers(approversJson);
        } else {
          // (2) 新規申請画面(ログインユーザーの役職から承認ルートの氏名取得)
          if (!session?.user?.department_id) return;
          const approversJson = await getApproversName(session.user.department_id);
          setApprovers(approversJson);
        }
      } catch (err) {
        console.error("承認者の取得エラー", err);
      }
    };

    if (status === "authenticated") {
      fetchApprovers();
    }
  }, [session, status]);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">事前申請タイトル</label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={e => isEditableFinal && setTitle(e.target.value)} disabled={!isEditableFinal}
          />
          {errors.title && <div style={{ color: 'red' }}>{errors.title}</div>}
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">出発日</label>
            <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!isEditableFinal} />
            {errors.start_date && <div style={{ color: 'red' }}>{errors.start_date}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">出発時間</label>
            <input type="time" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={!isEditableFinal} />
            {errors.start_time && <div style={{ color: 'red' }}>{errors.start_time}</div>}
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">到着日</label>
            <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!isEditableFinal} />
            {errors.end_date && <div style={{ color: 'red' }}>{errors.end_date}</div>}
          </div>
          <div className="col-md-6">
            <label className="form-label">到着時間</label>
            <input type="time" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={!isEditableFinal} />
            {errors.end_time && <div style={{ color: 'red' }}>{errors.end_time}</div>}
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">出張場所（目的地）</label>
          <input type="text" className="form-control" value={destination} onChange={e => setDestination(e.target.value)} disabled={!isEditableFinal} />
          {errors.destination && <div style={{ color: 'red' }}>{errors.destination}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label mb-2">費用明細</label>
          {expenses.map((exp, idx) => (
            <Card variant="outlined" className="mb-3" key={idx}>
              <CardContent>
                <div className="row">
                  <div className="col-md-3 mb-2">
                    <label className="form-label">費用種別</label>
                    <select
                      className="form-select"
                      value={exp.expense_type}
                      onChange={e => updateExpenseItem(idx, 'expense_type', Number(e.target.value))}
                      disabled={!isEditableFinal}
                    >
                      {EXPENSE_TYPES.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* 交通費専用フィールド */}
                {exp.expense_type === 1 && (
                  <>
                    <div className="row">
                      <div className="col-md-3 mb-2">
                        <label className="form-label">移動手段</label>
                        <select
                          className="form-select"
                          value={exp.transport_mode}
                          onChange={e => updateExpenseItem(idx, 'transport_mode', Number(e.target.value))}
                          disabled={!isEditableFinal}
                        >
                          {TRANSPORT_MODE_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {isEditableFinal && (<div className="col-md-3 mb-2">
                        <label className="form-label">経路選択</label>
                        <Button variant="outlined" onClick={() => openRouteModal(idx)} className="w-100 w-md-auto">
                          駅検索
                        </Button>
                      </div>
                      )}
                      <div className="col-md-3 mb-2">
                        <label className="form-label">出発地</label>
                        <input
                          type="text"
                          className="form-control"
                          value={exp.departure_place ?? ''}
                          onChange={e => updateExpenseItem(idx, 'departure_place', e.target.value)}
                          disabled={!isEditableFinal}
                        />
                      </div>
                      <div className="col-md-3 mb-2">
                        <label className="form-label">到着地</label>
                        <input
                          type="text"
                          className="form-control"
                          value={exp.arrival_place ?? ''}
                          onChange={e => updateExpenseItem(idx, 'arrival_place', e.target.value)}
                          disabled={!isEditableFinal}
                        />
                      </div>
                    </div>
                  </>
                )}
                {/* 出張手当専用フィールド */}
                {exp.expense_type === 3 && (
                  <div className="col-md-6">
                    <label className="form-label">手当種別</label>
                    <AllowanceSelector
                      startDate={startDate}
                      startTime={startTime}
                      endDate={endDate}
                      endTime={endTime}
                      selectedAllowanceId={exp.allowance_id}
                      onInvalid={() => setExpenses(prev => prev.filter((_, i) => i !== idx))}
                      onSelect={(selectedAllowance, amountOverride, description) => {
                        if (!selectedAllowance) {
                          const wasInvalid = exp.allowance_id !== null;
                          if (wasInvalid) {
                            setExpenses(prev => prev.filter((_, i) => i !== idx));
                          }
                          return;
                        }

                        // 通常更新
                        const amount = amountOverride ?? selectedAllowance.amount ?? 0;
                        const desc = description ?? selectedAllowance.name ?? '';
                        setExpenses(prev => {
                          const newExpenses = [...prev];
                          newExpenses[idx] = {
                            ...newExpenses[idx],
                            allowance_id: selectedAllowance.id,
                            description: desc,
                            amount: amount,
                            amountText: amount.toString(),
                          };
                          return newExpenses;
                        });
                      }}
                      allowanceMasters={allowanceMasters}
                      isEditableFinal={isEditableFinal}
                    />
                  </div>
                )}
                <div className="col-md-3 mb-2">
                  <label className="form-label">金額</label>
                  <input
                    className="form-control"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="金額"
                    value={exp.amountText ?? exp.amount.toString()}
                    onChange={e => {
                      const val = e.target.value;

                      // 入力中の文字列を保存
                      updateExpenseItem(idx, 'amountText', val);

                      // 正の整数なら amount に反映
                      if (/^\d+$/.test(val)) {
                        const num = Number(val);
                        updateExpenseItem(idx, 'amount', num);
                      }
                    }}
                    disabled={!isEditableFinal}
                  />
                  {errors.expenses && <span className="text-danger small">{errors.expenses}</span>}
                </div>
                <div className="row mb-2 align-items-end">
                  <div className="col">
                    <label className="form-label">詳細内容/備考</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="経路・備考等"
                      value={exp.description}
                      onChange={e => updateExpenseItem(idx, 'description', e.target.value)}
                      disabled={!isEditableFinal}
                    />
                  </div>
                  {isEditableFinal && (<div className="col-auto d-flex align-items-end">
                    <Button color="error" variant="outlined" onClick={() => removeExpenseItem(idx)}>
                      削除
                    </Button>
                  </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {isEditableFinal && (<Button variant="outlined" color="primary" onClick={addExpenseItem}>
            + 費用を追加
          </Button>
          )}
          {errors.expenses && <div style={{ color: 'red' }}>{errors.expenses}</div>}
        </div>
        {/* 合計金額表示 */}
        <div className="mb-2 text-end">
          <b>合計金額：</b>
          <span style={{ fontSize: '1.25em' }}>{totalAmount.toLocaleString()} 円</span>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        {/* 承認ルート表示 */}
        <div className="mb-3">
          <label className="form-label fw-bold">承認ルート</label>
          <ol className="list-group list-group-numbered w-100 w-md-auto">
            {approvalSteps.map((step, idx) => {
              const roleLabel = step.position_name ?? step.department_name ?? '不明';
              const stepTypeLabel = STEP_TYPES.find(t => t.value === step.step_type)?.label ?? '';
              const approverName = step.position != null ? approvers[step.position] : undefined;

              return (
                <li key={idx} className="list-group-item">
                  <div className="row">
                    {/* 左側：役職名＋種別 */}
                    <div className="col-6">
                      {roleLabel}（{stepTypeLabel}）
                    </div>
                    {/* 右側：氏名 */}
                    <div className="col-6 border-start ps-3">
                      {approverName ? (
                        <span className="badge bg-primary">{approverName}</span>
                      ) : (
                        <span className="text-muted">未設定</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
        {approval_histories && approval_histories.length > 0 && (
          <div className="mb-3">
            <label className="form-label fw-bold">承認・却下・確認履歴</label>
            <ul className="list-group w-100 w-md-auto">
              {approval_histories.map(h => (
                <li key={h.id} className="list-group-item">
                  <div><b>{h.action_user_name}（{POSITION_LABELS[h.action_user_position]}）: {PRE_APPLY_STATUS[h.status]}</b></div>
                  {h.comment && (
                    <div>コメント：{h.comment}</div>
                  )}
                  <div className="text-muted small">{formatDatetime(h.created_at)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {!isEditableFinal && !showApproveRejectButtons && !showConfirmButton && (
          <div className="mb-3 row">
            <div className="col-6 d-flex justify-content-start">
              <Button variant="outlined" onClick={onBack} color="inherit" startIcon={<ArrowBackIcon />} className="btn btn-outline-secondary w-100 w-md-auto">
                戻る
              </Button>
            </div>
          </div>
        )}
        {showApproveRejectButtons && (
          <>
            <div className="mb-3 row">
              <div className="col-4 d-flex justify-content-start">
                <Button variant="outlined" onClick={onBack} color="inherit" startIcon={<ArrowBackIcon />} className="btn btn-outline-secondary w-100 w-md-auto">
                  戻る
                </Button>
              </div>
              <div className="col-4 d-flex justify-content-center">
                <Button color="error" variant="outlined" onClick={handleRejectClick} className="btn btn-outline-danger w-100 w-md-auto">
                  却下
                </Button>
              </div>
              <div className="col-4 d-flex justify-content-end">
                <Button color="primary" variant="contained" onClick={handleApproveClick} className="w-100 w-md-auto">
                  承認
                </Button>
              </div>
            </div>
            <Dialog open={modalOpen} onClose={handleModalCancel} maxWidth="sm" fullWidth>
              <div style={{ padding: 24 }}>
                <h2>{modalType === 'approve' ? '承認確認' : '却下確認'}</h2>
                <TextField
                  label="コメント（任意・100文字以内）"
                  multiline
                  rows={4}
                  fullWidth
                  value={modalComment}
                  onChange={e => setModalComment(e.target.value)}
                  error={!!commentError}
                  helperText={commentError || '※コメントは任意です'}
                  inputProps={{ maxLength: 100 }}
                />
                <div className="my-3 d-flex gap-2 justify-content-end">
                  <Button variant="outlined" onClick={handleModalCancel}>キャンセル</Button>
                  <Button variant="contained" color={modalType === 'approve' ? 'primary' : 'error'} onClick={handleModalSubmit}>
                    {modalType === 'approve' ? '承認' : '却下'}
                  </Button>
                </div>
              </div>
            </Dialog>
          </>
        )}
        {showConfirmButton && (
          <>
            <div className="mb-3 row">
              <div className="col-6 d-flex justify-content-start">
                <Button variant="outlined" onClick={onBack} color="inherit" className="btn btn-outline-secondary w-100 w-md-auto">
                  戻る
                </Button>
              </div>
              <div className="col-6 d-flex justify-content-end">
                <Button variant="contained" color="primary" onClick={handleConfirmClick} className="w-100 w-md-auto">
                  確認
                </Button>
              </div>
            </div>

            {/* 確認モーダル */}
            <Dialog open={modalOpen} onClose={handleModalCancel} maxWidth="sm" fullWidth>
              <div style={{ padding: 24 }}>
                <h2>確認</h2>
                <TextField
                  label="コメント（任意・100文字以内）"
                  multiline
                  rows={4}
                  fullWidth
                  value={modalComment}
                  onChange={e => setModalComment(e.target.value)}
                  error={!!commentError}
                  helperText={commentError || '※コメントは任意です'}
                  inputProps={{ maxLength: 100 }}
                />
                <div className="my-3 d-flex gap-2 justify-content-end">
                  <Button variant="outlined" onClick={handleModalCancel}>キャンセル</Button>
                  <Button variant="contained" color="primary" onClick={handleModalSubmit}>
                    確認
                  </Button>
                </div>
              </div>
            </Dialog>
          </>
        )}
        {isEditableFinal && (
          <div className="mb-3 row">
            <div className="col-6 d-flex justify-content-start">
              <Button variant="outlined" onClick={onBack} color="inherit" startIcon={<ArrowBackIcon />} className="btn btn-outline-secondary w-100 w-md-auto">
                戻る
              </Button>
            </div>
            <div className="col-6 d-flex justify-content-end">
              <Button type="submit" variant="contained" color="primary" endIcon={<SaveIcon />} className="w-100 w-md-auto">
                {submitLabel}
              </Button>
            </div>
          </div>
        )}
      </form>
      {/* 駅検索モーダル */}
      <Dialog open={showRouteModal} onClose={closeRouteModal} maxWidth="sm" fullWidth>
        <div style={{ padding: 24 }}>
          <h2>駅検索で出発地・到着地入力</h2>
          <div className="mb-2">
            <label>出発地</label>
            <input
              type="text"
              className="form-control"
              value={routeFrom}
              onChange={e => setRouteFrom(e.target.value)}
              list="stationFromList"
              placeholder="出発駅名"
            />
            <datalist id="stationFromList">
              {stationSuggestionsFrom.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {stationLoadingFrom && <div>検索中...</div>}
          </div>
          <div className="mb-2">
            <label>到着地</label>
            <input
              type="text"
              className="form-control"
              value={routeTo}
              onChange={e => setRouteTo(e.target.value)}
              list="stationToList"
              placeholder="到着駅名"
            />
            <datalist id="stationToList">
              {stationSuggestionsTo.map(name => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {stationLoadingTo && <div>検索中...</div>}
          </div>
          <div className="my-3 d-flex gap-2">
            <Button variant="contained" color="primary" onClick={handleRouteSelect} disabled={!routeFrom || !routeTo}>
              セットする
            </Button>
            <Button variant="outlined" onClick={closeRouteModal}>キャンセル</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
