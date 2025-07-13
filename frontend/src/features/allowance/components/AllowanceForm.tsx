'use client';

import { useState } from 'react';
import { CONDITIONS, Condition } from '../types';
import { errorMessages } from "@/src/utils/messages";
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import Link from 'next/link';

/**
 * HH:MM形式に変換
 */
function toHHMM(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5);
}

type AllowanceFormValues = {
  name: string;
  condition: number;
  time: string | null;
  amount: number;
  is_active: boolean;
};

type AllowanceFormProps = {
  initialData?: Partial<AllowanceFormValues>;
  onSubmit: (data: AllowanceFormValues) => Promise<void>;
  submitLabel?: string;
};

const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${hour.toString().padStart(2, '0')}:${minute}`,
  };
});

export default function AllowanceForm({
  initialData,
  onSubmit,
  submitLabel = "登録"
}: AllowanceFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [condition, setCondition] = useState(initialData?.condition ?? '');
  const [time, setTime] = useState(toHHMM(initialData?.time));
  const [amount, setAmount] = useState(initialData?.amount ?? 0);
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);

  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof AllowanceFormValues, string>>>({});

  function validate() {
    const newErrors: Partial<Record<keyof AllowanceFormValues, string>> = {};

    // 手当名
    if (!name.trim()) {
      newErrors.name = errorMessages.required("手当名");
    } else if (name.length > 50) {
      newErrors.name = errorMessages.maxLength("手当名", 50);
    }

    // 適用条件
    if (!condition) {
      newErrors.condition = errorMessages.required("適用条件");
    } else if (!CONDITIONS.some(c => c.value === condition)) {
      newErrors.condition = errorMessages.notExist("適用条件");
    }

    // 時間
    if (condition === 1 || condition === 2) {
      if (!time) {
        newErrors.time = errorMessages.required("時間");
      } else if (!timeOptions.some(opt => opt.value === time)) {
        newErrors.time = errorMessages.notExist("時間");
      }
    } else {
      // 日跨ぎの場合はtimeは任意、ただし値があれば30分単位チェック
      if (time && !timeOptions.some(opt => opt.value === time)) {
        newErrors.time = errorMessages.notExist("時間");
      }
    }

    // 金額
    if (amount === undefined || amount === null || amount === 0) {
      newErrors.amount = errorMessages.required("金額");
    } else if (amount < 1) {
      newErrors.amount = errorMessages.minAmount("金額", 1);
    }

    // アクティブ
    if (typeof isActive !== "boolean") {
      newErrors.is_active = errorMessages.required("アクティブ");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    try {
      await onSubmit({
        name,
        condition: Number(condition) as Condition,
        time: time === '' ? null : time,
        amount,
        is_active: isActive,
      });
    } catch (err) {
      setError(`${submitLabel}に失敗しました`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="name" className="form-label">手当名</label>
        <input
          id="name"
          name="name"
          type="text"
          className="form-control"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {errors.name && <div style={{ color: 'red' }}>{errors.name}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="condition" className="form-label">適用条件</label>
        <select
          id="condition"
          name="condition"
          className="form-select"
          value={condition}
          onChange={e => setCondition(Number(e.target.value) as Condition)}
        >
          <option value="">選択してください</option>
          {CONDITIONS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {errors.condition && <div style={{ color: 'red' }}>{errors.condition}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="time" className="form-label">時間</label>
        <select
          id="time"
          name="time"
          className="form-select"
          value={time}
          onChange={e => setTime(e.target.value)}
        >
          <option value="">選択してください</option>
          {timeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {errors.time && <div style={{ color: 'red' }}>{errors.time}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="amount" className="form-label">金額（円）</label>
        <input
          id="amount"
          name="amount"
          type="number"
          className="form-control"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
        />
        {errors.amount && <div style={{ color: 'red' }}>{errors.amount}</div>}
      </div>
      <div className="mb-3 form-check">
        <input
          id="is_active"
          name="is_active"
          type="checkbox"
          className="form-check-input"
          checked={isActive}
          onChange={e => setIsActive(e.target.checked)}
        />
        <label htmlFor="is_active" className="form-check-label">アクティブ</label>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="mb-3 row">
        <div className="col-6 d-flex justify-content-start">
          <Button
            component={Link}
            href="/master/allowance"
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            className="btn btn-outline-secondary w-100 w-md-auto"
          >
            戻る
          </Button>
        </div>
        <div className="col-6 d-flex justify-content-end">
          <Button
            type="submit"
            variant="contained"
            color="primary"
            endIcon={<SaveIcon />}
            className="w-100 w-md-auto"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
