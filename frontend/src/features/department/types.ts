export const DEPARTMENT_LEVELS = [
  { value: 1, label: '社長' },
  { value: 2, label: '事業部' },
  { value: 3, label: '課' },
] as const;

export type DepartmentLevel = typeof DEPARTMENT_LEVELS[number]['value'];
