import { StepType, ApprovalStepWithApprover } from '@/src/features/approval/types';
import { User } from '@/src/features/user/types';

export const EXPENSE_TYPES = [
  { value: 1, label: '交通費' },
  { value: 2, label: 'ホテル代' },
  { value: 3, label: '出張手当' },
] as const;

export type ExpenseType = typeof EXPENSE_TYPES[number]['value'];

export const PRE_APPLY_STATUS: { [key: number]: string } = {
  0: '申請',
  1: '承認待ち',
  2: '却下',
  3: '承認済',
  4: '確認済',
};

export const Enum_PRE_APPLY_STATUS = {
  Apply: 0,
  Pending: 1,
  Rejected: 2,
  Approved: 3,
  Confirmed: 4,
} as const;

export type PreApplyStatus = typeof Enum_PRE_APPLY_STATUS[keyof typeof Enum_PRE_APPLY_STATUS];

// ラベルマップ（数値→文字列）
export const Enum_PRE_APPLY_STATUS_LABELS: { [key in PreApplyStatus]: string } = {
  [Enum_PRE_APPLY_STATUS.Apply]: '承認待ち',
  [Enum_PRE_APPLY_STATUS.Pending]: '承認待ち',
  [Enum_PRE_APPLY_STATUS.Rejected]: '却下',
  [Enum_PRE_APPLY_STATUS.Approved]: '承認済',
  [Enum_PRE_APPLY_STATUS.Confirmed]: '確認済',
};

export type ExpenseItem = {
  expense_type: number;
  transport_mode?: number;
  amount: number;
  description: string;
  departure_place?: string;
  arrival_place?: string;
  allowance_id?: number | null;
  amountText?: string;
};

export type ApprovalHistory = {
  id: number;
  action_user_id: number;
  next_user_id: number;
  approver_name: string;
  status: number;
  comment?: string;
  action_user_name: string;
  action_user_position: number;
  created_at: string;
  updated_at: string;
  step_type?: StepType;
};

export type TripApplyFormValues = {
  id?: number;
  title: string;
  request_type: number;
  status: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  destination: string;
  approval_route_master_id: number;
  expenses: ExpenseItem[];
  allowances: {
    allowance_master_id: number;
    amount: number;
    description: string;
  }[];
};

export type TripPreApplyDetail = TripApplyFormValues & {
  request_user_id: number;  // 申請者のユーザーIDを明示的に含める
  approval_histories: ApprovalHistory[];
  next_user_id: number;
  next_step_type: number;
  approval_steps: ApprovalStepWithApprover[];
  request_user: User;
};

export const APPROVAL_HISTORY_STATUS = {
  Pending: 1,     // 未処理・承認待ち
  Approved: 3,    // 承認済
  Rejected: 2,    // 却下
  Confirmed: 5,   // 確認済（必要に応じ）
} as const;
type ApprovalHistoryStatus = typeof APPROVAL_HISTORY_STATUS[keyof typeof APPROVAL_HISTORY_STATUS];

export const APPLY_STATUS: { [key: number]: string } = {
  1: '承認待ち',
  2: '却下',
  3: '精算待ち',
  4: '精算済'
};

export const TRANSPORT_MODE_OPTIONS = [
  { value: 1, label: '電車' },
  { value: 2, label: 'バス' },
  { value: 3, label: '飛行機' },
  { value: 4, label: '社用車' },
  { value: 5, label: 'フェリー' },
  { value: 6, label: 'タクシー' },
  { value: 7, label: 'レンタカー' },
  { value: 99, label: 'その他' },
] as const;

export type TransportMode = typeof TRANSPORT_MODE_OPTIONS[number]['value'];

export type AllowanceMaster = {
  id: number;
  name: string;
  amount: number;
  condition: 1 | 2 | 3; // Condition: 1=出発時間, 2=到着時間, 3=日跨ぎ
  time: string; // format: "HH:MM:SS"
};

// 出張手当条件（任意で明示的 enum 型も）
export const ALLOWANCE_CONDITIONS = {
  DEPARTURE: 1,
  ARRIVAL: 2,
  OVERNIGHT: 3,
} as const;

export type AllowanceCondition = typeof ALLOWANCE_CONDITIONS[keyof typeof ALLOWANCE_CONDITIONS]; // 1 | 2 | 3

export type BusinessTripRequest = {
  id: number;
  title: string;
  status: number;
  request_user: { username: string };
  destination: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export type BusinessTripRequestListItem = {
  id: number;
  title: string;
  status: number;
  destination: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  request_user: {
    id: number;
    username: string;
  };
};

export type SearchValues = {
  status: string;
  title: string;
  applicant: string;
  destination: string;
};
