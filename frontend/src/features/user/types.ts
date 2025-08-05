export const POSITIONS = [
  { value: 1, label: '社長' },
  { value: 2, label: '事業部長' },
  { value: 3, label: '課長' },
  { value: 4, label: '一般' },
] as const;

export type POSITION = typeof POSITIONS[number]['value'];

export type User = {
  id: number;
  username: string;
  email: string;
  department: number;
  position: number;
  has_master_permission: boolean;
  created_at: string;
  updated_at: string;
};
