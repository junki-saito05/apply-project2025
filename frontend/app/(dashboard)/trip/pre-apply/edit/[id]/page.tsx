'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import TripApplyForm from '@/src/features/trip/components/tripApplyForm';
import type { TripApplyFormValues, TripPreApplyDetail } from '@/src/features/trip/types';
import { Enum_PRE_APPLY_STATUS } from '@/src/features/trip/types';
import {
  getTripPreApplyDetail,
  approveTripPreApply,
  rejectTripPreApply,
  deleteTripPreApply,
  updateTripPreApply,
  confirmTripPreApply
} from '@/src/features/trip/api/tripApplyApi';
import { useSession } from 'next-auth/react';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

type Mode = 'applicant_view_only' | 'applicant_edit' | 'approver' | 'special_department_view' | 'checker';

export default function TripPreApplyEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [initialData, setInitialData] = useState<TripPreApplyDetail | null>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isUserTurn, setIsUserTurn] = useState(false);

  const user = session?.user;
  const canDelete = mode === 'approver';

  // ステータス定義
  const STATUS_PENDING = Enum_PRE_APPLY_STATUS.Pending;
  const STATUS_APPROVED = Enum_PRE_APPLY_STATUS.Approved;
  const STATUS_REJECTED = Enum_PRE_APPLY_STATUS.Rejected;
  const STATUS_CONFIRMED = Enum_PRE_APPLY_STATUS.Confirmed;

  // 特別部署IDリスト（適宜環境変数などで管理を）
  const specialDepartment = process.env.NEXT_PUBLIC_SPECIAL_DEPARTMENT_IDS ?? '';
  const SPECIAL_DEPARTMENT_IDS = specialDepartment.split(',').map(id => Number(id.trim()));
  // const SPECIAL_DEPARTMENT_IDS = [1, 8, 9, 10];

  // 申請詳細取得
  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const detail = await getTripPreApplyDetail(id);
        setInitialData(detail);
      } catch (error) {
        alert('申請情報の取得に失敗しました');
        router.push('/trip/pre-apply');
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id, router]);

  // モード判定（申請詳細とユーザー情報がセットされたら）
  useEffect(() => {
    if (!initialData || !user) return;

    const currentUserId = user.id;
    const userPosition = user.position;
    const userDepartmentId = user.department_id;

    const isApplicant = currentUserId === (initialData.request_user_id ?? -1);

    // 承認or確認の順番がログインユーザーかどうか
    const isTurn = Number(initialData?.next_user_id) === Number(currentUserId);
    setIsUserTurn(isTurn);

    // ①申請者本人の場合
    if (isApplicant) {
      if (initialData.status === STATUS_REJECTED) {
        setMode('applicant_edit'); // 却下は編集可能
      } else {
        setMode('applicant_view_only'); // 承認待ち or 承認済は閲覧のみ
      }
      return;
    }

    // ②承認 or 確認者のターン
    if ((userPosition === 2 || userPosition === 3 || userPosition === 1) && (initialData.status === STATUS_PENDING || initialData.status === STATUS_APPROVED)) {
      if (isTurn) {
        const isChecker = initialData?.next_step_type === 2;
        setMode(isChecker ? 'checker' : 'approver');
        return;
      }
    }

    // ③特別部署は閲覧のみ（ただし①②が優先）
    if (userDepartmentId && SPECIAL_DEPARTMENT_IDS.includes(userDepartmentId)) {
      setMode('special_department_view');
      return;
    }

    // その他は閲覧のみモード
    setMode('applicant_view_only');

  }, [initialData, user]);

  useEffect(() => {
    console.log('mode:', mode);
  }, [mode]);

  // 戻る
  const handleBack = useCallback(() => router.back(), [router]);

  // 削除（承認者のみ）
  const handleDelete = useCallback(async () => {
    if (!id) return;
    if (!confirm('本当に削除しますか？')) return;

    setSubmitting(true);
    try {
      await deleteTripPreApply(id);
      router.push('/trip/pre-apply?message=削除が完了しました');
    } catch {
      alert('削除に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }, [id, router]);

  const handleSubmit = async (data: TripApplyFormValues) => {
    setSubmitting(true);
    try {
      if (!initialData?.id) {
        alert('更新する申請IDが見つかりません');
        setSubmitting(false);
        return;
      }
      await updateTripPreApply(initialData.id, data);
      router.push('/trip/pre-apply?message=再申請が完了しました');
    } catch {
      alert('保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 承認者用承認・却下
  const handleApprove = useCallback(
    async (comment: string) => {
      if (!id) return;
      setSubmitting(true);
      try {
        await approveTripPreApply(id, comment);
        router.push('/trip/pre-apply?message=承認が完了しました');
      } catch (error) {
        alert('承認に失敗しました');
      } finally {
        setSubmitting(false);
      }
    },
    [id, router]
  );

  const handleReject = useCallback(
    async (comment: string) => {
      if (!id) return;
      setSubmitting(true);
      try {
        await rejectTripPreApply(id, comment);
        router.push('/trip/pre-apply?message=却下が完了しました');
      } catch (error) {
        alert('却下に失敗しました');
      } finally {
        setSubmitting(false);
      }
    },
    [id, router]
  );

  const handleConfirm = useCallback(
    async (comment: string) => {
      if (!id) return;
      setSubmitting(true);
      try {
        await confirmTripPreApply(id, comment);
        router.push('/trip/pre-apply?message=確認が完了しました');
      } catch (error) {
        alert('確認に失敗しました');
      } finally {
        setSubmitting(false);
      }
    },
    [id, router]
  );

  if (loading || !mode) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-4">出張事前申請詳細</h1>
        {canDelete && (
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            削除
          </Button>
        )}
      </div>
      <TripApplyForm
        initialData={initialData ?? undefined}
        mode={mode}
        isUserTurn={isUserTurn}
        submitLabel={mode === 'applicant_edit' ? '保存' : undefined}
        onBack={handleBack}
        onSubmit={handleSubmit}
        onApprove={mode === 'approver' ? handleApprove : undefined}
        onReject={mode === 'approver' ? handleReject : undefined}
        onConfirm={mode === 'checker' ? handleConfirm : undefined}
      />
    </div>
  );
}
