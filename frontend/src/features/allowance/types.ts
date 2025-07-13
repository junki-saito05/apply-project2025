export const CONDITIONS = [
  { value: 1, label: '出発時間' },
  { value: 2, label: '到着時間' },
  { value: 3, label: '日跨ぎ' },
] as const;

export type Condition = typeof CONDITIONS[number]['value'];
