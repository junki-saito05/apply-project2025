'use client';

import { useEffect, useState } from 'react';
import { AllowanceMaster } from '@/src/features/allowance/api/allowanceApi';
import { checkAllowanceValid } from '@/src/utils/checkAllowanceValid';

type Props = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  selectedAllowanceId?: number | null;
  onInvalid?: () => void;
  onSelect: (allowance: AllowanceMaster | null, amountOverride?: number, description?: string) => void;
  allowanceMasters: AllowanceMaster[];
  isEditableFinal: boolean;
};

function toMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function diffInDays(start: Date, end: Date): number {
  const startUTC = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, (endUTC - startUTC) / (1000 * 60 * 60 * 24));
}

export default function AllowanceSelector({
  startDate,
  endDate,
  startTime,
  endTime,
  selectedAllowanceId,
  onSelect,
  allowanceMasters,
  isEditableFinal,
}: Props) {
  const [filtered, setFiltered] = useState<AllowanceMaster[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setErrorMessage('');

    if (!startDate || !endDate || !startTime || !endTime) {
      setFiltered([]);
      setErrorMessage('出発日、到着日、出発時間、到着時間を入力してください');
      return;
    }

    const result = allowanceMasters.filter((a) =>
      checkAllowanceValid(a, startDate, endDate, startTime, endTime)
    );
    setFiltered(result);
  }, [startDate, endDate, startTime, endTime, allowanceMasters]);

  useEffect(() => {
    if (
      !selectedAllowanceId ||
      !startDate || !endDate ||
      !startTime || !endTime ||
      filtered.length === 0
    ) return;

    const selected = filtered.find(a => a.id === selectedAllowanceId);
    if (!selected) return;

    let amount = selected.amount;
    let desc = selected.name;

    if (selected.condition === 3) {
      const days = diffInDays(new Date(startDate), new Date(endDate));
      const actualDays = Math.max(1, days);
      amount = selected.amount * actualDays;
      desc = `${selected.name} × ${actualDays}日 = ${amount.toLocaleString()}円`;
    }

    onSelect(selected, amount, desc);
  }, [selectedAllowanceId, startDate, endDate, startTime, endTime, filtered]);

  const handleSelect = (id: number) => {
    const selected = filtered.find((a) => a.id === id) ?? null;

    if (!selected) {
      onSelect(null);
      return;
    }

    // --- 日跨ぎのみ金額を日数分に増やす ---
    let amount = selected.amount;
    let description = selected.name;

    if (selected.condition === 3 && startDate && endDate) {
      const days = diffInDays(new Date(startDate), new Date(endDate));
      const validDays = days > 0 ? days : 1;
      amount = selected.amount * validDays;
      description = `${selected.name} × ${validDays}日 = ${amount.toLocaleString()}円`;
    }

    onSelect(selected, amount, description);
  };

  return (
    <div>
      {errorMessage && (
        <div style={{ color: 'red', fontSize: '0.9em' }}>{errorMessage}</div>
      )}
      {!errorMessage && (
        <select
          className="form-select"
          value={selectedAllowanceId ?? ''}
          onChange={(e) => handleSelect(Number(e.target.value))}
          disabled={!isEditableFinal}
        >
          <option value="">選択してください</option>
          {filtered.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} / {a.amount.toLocaleString()}円
              {a.condition === 3 ? '（日跨ぎ × 日数）' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
