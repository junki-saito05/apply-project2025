'use client';

import { useEffect, useState } from 'react';
import { getDivisions, createDepartment, Division } from '../api/departmentApi';
import type { Department } from '../api/departmentApi';
import Link from 'next/link';
import { DEPARTMENT_LEVELS, DepartmentLevel } from '../types';
import { errorMessages } from "@/src/utils/messages";

type DepartmentFormProps = {
  initialData?: Partial<Department>;
  onSubmit: (data: { name: string; level: number; parent?: number | null }) => Promise<void>;
  submitLabel?: string;
};

export default function DepartmentForm({
  initialData,
  onSubmit,
  submitLabel = "登録"
}: DepartmentFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [level, setLevel] = useState<number | ''>(initialData?.level ?? '');
  const [parentId, setParentId] = useState<number | null>(initialData?.parent ?? null);
  const [error, setError] = useState<string | null>(null);

  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);

  const [errors, setErrors] = useState<{ name?: string; level?: string; parentId?: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name ?? '');
      setLevel(initialData.level ?? '');
      setParentId(initialData.parent ?? null);
    }
  }, [initialData]);

  useEffect(() => {
    if (level === 3) {
      setLoadingDivisions(true);
      getDivisions()
        .then(setDivisions)
        .catch(() => setDivisions([]))
        .finally(() => setLoadingDivisions(false));
    }
  }, [level]);

  function validate() {
    const newErrors: { name?: string; level?: string; parentId?: string } = {};

    // 部門名
    if (!name.trim()) {
      newErrors.name = errorMessages.required("部門名");
    } else if (name.length > 20) {
      newErrors.name = errorMessages.maxLength("部門名", 20);
    }

    // 階層
    if (!level) {
      newErrors.level = errorMessages.required("階層");
    } else if (!DEPARTMENT_LEVELS.some(lv => lv.value === Number(level))) {
      newErrors.level = errorMessages.notExist("階層");
    }

    // 上位事業部（課のときだけ）
    if (level === 3) {
      if (!parentId) {
        newErrors.parentId = errorMessages.required("上位事業部");
      } else if (!divisions.some(div => div.id === parentId)) {
        newErrors.parentId = errorMessages.notExist("上位事業部");
      }
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
        level: Number(level),
        parent: level === 3 ? parentId : null,
      });
    } catch (err) {
      setError(`${submitLabel}に失敗しました`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="name" className="form-label">部門名</label>
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
        <label htmlFor="level" className="form-label">階層</label>
        <select
          id="level"
          name="level"
          className="form-select"
          value={level ?? ''}
          onChange={e => setLevel(Number(e.target.value) as DepartmentLevel)}
        >
          <option value="">選択してください</option>
          {DEPARTMENT_LEVELS.map(lv => (
            <option key={lv.value} value={lv.value}>{lv.label}</option>
          ))}
        </select>
        {errors.level && <div style={{ color: 'red' }}>{errors.level}</div>}
      </div>
      {level === 3 && (
        <div className="mb-3">
          <label htmlFor="parentId" className="form-label">上位事業部</label>
          <select
            id="parentId"
            name="parentId"
            className="form-select"
            value={parentId ?? ''}
            onChange={e => setParentId(Number(e.target.value))}
            disabled={loadingDivisions}
          >
            <option value="">選択してください</option>
            {divisions.map(div => (
              <option key={div.id} value={div.id}>{div.name}</option>
            ))}
          </select>
          {loadingDivisions && <span>読み込み中...</span>}
          {errors.parentId && <div style={{ color: 'red' }}>{errors.parentId}</div>}
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="mb-3 row">
        <div className="col-6 d-flex justify-content-start">
          <Link href="/master/department" className="btn btn-secondary w-100 w-md-auto">
            戻る
          </Link>
        </div>
        <div className="col-6 d-flex justify-content-end">
          <button type="submit" className="btn btn-primary w-100 w-md-auto">{submitLabel}</button>
        </div>
      </div>
    </form>
  );
}
