export function formatDatetime(dt: string | Date | undefined | null): string {
  if (!dt) return '';
  const date = (dt instanceof Date) ? dt : new Date(dt);
  if (isNaN(date.getTime())) return ''; // 無効日付対策
  return date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}
