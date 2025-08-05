import { AllowanceMaster } from '@/src/features/allowance/api/allowanceApi';

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export function checkAllowanceValid(
  allowance: AllowanceMaster,
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string
): boolean {
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  if (allowance.condition === 1 && allowance.time) {
    return startMinutes < toMinutes(allowance.time.slice(0, 5));
  }
  if (allowance.condition === 2 && allowance.time) {
    return endMinutes > toMinutes(allowance.time.slice(0, 5));
  }
  if (allowance.condition === 3) {
    return endDateObj.getTime() > startDateObj.getTime();
  }
  return false;
}
