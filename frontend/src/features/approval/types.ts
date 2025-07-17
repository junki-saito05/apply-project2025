import { POSITION } from '@/src/features/user/types';

// ステップ種別（1: 承認, 2: 確認）
export type StepType = 1 | 2;

export const STEP_TYPES = [
  { value: 1, label: '承認' },
  { value: 2, label: '確認' },
] as const;

// API送信用のステップ
export type ApprovalStep = {
  step_number: number;
  step_type: StepType;
  position: POSITION | null;
  department_id: number | null;
};

// フォームUI用のステップ（空文字許容）
export type ApprovalStepForm = {
  step_number: number;
  step_type: StepType | '';
  position: POSITION | '' | null;
  department_id: number | '';
};

// 登録用ルートフォーム値
export type ApprovalFormValues = {
  name: string;
  description?: string;
  steps: ApprovalStep[]; // 送信用型
};

// 一覧表示用ステップ（名前付き）
export type ApprovalStepResponse = {
  step_number: number;
  step_type: StepType;
  position: number | null;
  position_name: string | null;
  department_id: number | null;
  department_name: string | null;
};

// 一覧表示用ルート
export type ApprovalRoute = {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  steps: ApprovalStepResponse[];
};
