'use client';

import { useEffect, useState } from 'react';
import React from 'react';
import { getDepartments, Department } from '@/src/features/department/api/departmentApi';
import { POSITIONS } from '../types';
import type { User } from '../api/userApi';
import Link from 'next/link';
import { errorMessages } from "@/src/utils/messages";
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

type UserFormProps = {
  initialData?: Partial<User>;
  onSubmit: (data: any) => Promise<void>;
  submitLabel?: string;
  isEdit?: boolean;
};

export default function UserForm({
  initialData,
  onSubmit,
  submitLabel = "登録",
  isEdit = false,
}: UserFormProps) {
  const [username, setUserName] = useState(initialData?.username ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>(initialData?.department ?? '');
  const [position, setPosition] = useState<number | ''>(initialData?.position ?? '');
  const [hasMasterPermission, setHasMasterPermission] = useState<boolean>(initialData?.has_master_permission ?? false);

  // 選択肢
  const [departments, setDepartments] = useState<Department[]>([]);

  // エラー
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  // 部門一覧取得
  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  function validate() {
    const newErrors: { [key: string]: string } = {};

    // 氏名
    if (!username.trim()) {
      newErrors.username = errorMessages.required("氏名");
    } else if (username.length > 30) {
      newErrors.username = errorMessages.maxLength("氏名", 30);
    }

    // メール
    if (!email.trim()) {
      newErrors.email = errorMessages.required("メールアドレス");
    } else if (email.length > 50) {
      newErrors.email = errorMessages.maxLength("メールアドレス", 50);
    } else if (!/^[\w\-.]+@[\w\-.]+\.[a-zA-Z]{2,}$/.test(email)) {
      newErrors.email = errorMessages.emailFormat();
    }

    // パスワード
    if (isEdit) {
      // 変更画面
      if (password) {
        // 入力があればバリデーション
        if (password.length > 30) {
          newErrors.password = errorMessages.maxLength("パスワード", 30);
        } else if (password.length < 8) {
          newErrors.password = errorMessages.minLength("パスワード", 8);
        } else if (
          !(
            /[0-9]/.test(password) &&
            /[a-z]/.test(password) &&
            /[A-Z]/.test(password) &&
            /[!-/:-@[-`{-~]/.test(password)
          )
        ) {
          newErrors.password = errorMessages.passwordPolicy();
        }
        // パスワード確認
        if (password !== confirmPassword) {
          newErrors.confirmPassword = errorMessages.confirmPassword();
        }
      }
      // 未入力ならバリデーションしない
    } else {
      // 登録画面
      if (!password) {
        newErrors.password = errorMessages.required("パスワード");
      } else if (password.length < 8) {
        newErrors.password = errorMessages.minLength("パスワード", 8);
      } else if (password.length > 30) {
        newErrors.password = errorMessages.maxLength("パスワード", 30);
      } else if (
        !(
          /[0-9]/.test(password) &&
          /[a-z]/.test(password) &&
          /[A-Z]/.test(password) &&
          /[!-/:-@[-`{-~]/.test(password)
        )
      ) {
        newErrors.password = errorMessages.passwordPolicy();
      }

      // パスワード確認
      if (password !== confirmPassword) {
        newErrors.confirmPassword = errorMessages.confirmPassword();
      }
    }

    // 部門
    if (!departmentId) {
      newErrors.departmentId = errorMessages.required("部門");
    } else if (!departments.some(d => d.id === departmentId)) {
      newErrors.departmentId = errorMessages.notExist("部門");
    }

    // 役職
    if (!position) {
      newErrors.position = errorMessages.required("役職");
    } else if (!POSITIONS.some(p => p.value === position)) {
      newErrors.position = errorMessages.notExist("役職");
    }

    // マスター管理権限
    if (typeof hasMasterPermission !== "boolean") {
      newErrors.hasMasterPermission = errorMessages.required("マスター管理権限");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // 送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    try {
      // 変更時、パスワード未入力なら送信データから除外
      const data: any = {
        username,
        email,
        department_id: Number(departmentId),
        position: Number(position),
        has_master_permission: hasMasterPermission ? 1 : 0,
      };
      if (!isEdit || password) {
        data.password = password;
      }
      await onSubmit(data);
    } catch (err) {
      setError(`${submitLabel}に失敗しました`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label htmlFor="username" className="form-label">氏名</label>
        <input
          id="username"
          name="username"
          type="text"
          className="form-control"
          value={username}
          onChange={e => setUserName(e.target.value)}
        />
        {errors.username && <div style={{ color: 'red' }}>{errors.username}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="email" className="form-label">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="text"
          className="form-control"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {errors.email && <div style={{ color: 'red' }}>{errors.email}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="password" className="form-label">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          className="form-control"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {errors.password && <div style={{ color: 'red' }}>{errors.password}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="confirmPassword" className="form-label">パスワード確認</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="form-control"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
        />
        {errors.confirmPassword && <div style={{ color: 'red' }}>{errors.confirmPassword}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="departmentId" className="form-label">部門</label>
        <select
          id="departmentId"
          name="departmentId"
          className="form-select"
          value={departmentId}
          onChange={e => setDepartmentId(Number(e.target.value))}
        >
          <option value="">選択してください</option>
          {departments.map(dep => (
            <option key={dep.id} value={dep.id}>
              {dep.name}
            </option>
          ))}
        </select>
        {errors.departmentId && <div style={{ color: 'red' }}>{errors.departmentId}</div>}
      </div>
      <div className="mb-3">
        <label htmlFor="position" className="form-label">役職</label>
        <select
          id="position"
          name="position"
          className="form-select"
          value={position}
          onChange={e => setPosition(Number(e.target.value))}
        >
          <option value="">選択してください</option>
          {POSITIONS.map(pos => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </select>
        {errors.position && <div style={{ color: 'red' }}>{errors.position}</div>}
      </div>
      <div className="mb-3">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="hasMasterPermission"
            name="hasMasterPermission"
            checked={hasMasterPermission}
            onChange={e => setHasMasterPermission(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="hasMasterPermission">
            マスター管理権限を付与する
          </label>
        </div>
        {errors.hasMasterPermission && (
          <div style={{ color: 'red' }}>{errors.hasMasterPermission}</div>
        )}
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="mb-3 row">
        <div className="col-6 d-flex justify-content-start">
          <Button
            component={Link}
            href="/master/user"
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
