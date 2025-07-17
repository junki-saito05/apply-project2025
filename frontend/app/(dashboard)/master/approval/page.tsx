'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApprovalRoutes } from '@/src/features/approval/api/approvalApi';
import { POSITIONS } from '@/src/features/user/types';
import { Department, getDepartments } from '@/src/features/department/api/departmentApi';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export default function ApprovalListPage() {
  const [searchName, setSearchName] = useState('');
  const [searchPosition, setSearchPosition] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('');

  const [routes, setRoutes] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getApprovalRoutes({
      name: searchName || undefined,
      position: searchPosition ? Number(searchPosition) : undefined,
      department: searchDepartment ? Number(searchDepartment) : undefined,
    })
      .then(setRoutes)
      .finally(() => setLoading(false));
  }, [searchName, searchPosition, searchDepartment]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        router.replace('/master/approval', { scroll: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, router]);

  const formatDate = (dateStr: string) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      : '';

  const getStepTypeLabel = (type: number) => (type === 1 ? '承認' : '確認');

  return (
    <div>
      {message && (
        <div className="alert alert-primary" role="alert">
          {message}
        </div>
      )}

      <h1 className="mb-4">承認ルート一覧</h1>

      {/* 検索フォーム */}
      <div className="card mb-4">
        <div className="card-body">
          <form className="mb-4 row g-3 align-items-end" onSubmit={e => e.preventDefault()}>
            <div className="col-md-4">
              <label className="form-label">承認ルート名</label>
              <input
                type="text"
                className="form-control"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">役職</label>
              <select
                className="form-select"
                value={searchPosition}
                onChange={e => setSearchPosition(e.target.value)}
              >
                <option value="">すべて</option>
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">部署</label>
              <select
                className="form-select"
                value={searchDepartment}
                onChange={e => setSearchDepartment(e.target.value)}
              >
                <option value="">すべて</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>
      </div>

      <div className="mb-3">
        <Button
          component={Link}
          href="/master/approval/add"
          variant="contained"
          endIcon={<AddIcon />}
          className="btn btn-info justify-content-start"
        >
          新規登録
        </Button>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>承認ルート名</th>
              <th>ステップ</th>
              <th>登録日</th>
              <th>更新日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center">
                  読み込み中...
                </td>
              </tr>
            ) : routes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  データがありません
                </td>
              </tr>
            ) : (
              routes.map(route => (
                <tr key={route.id}>
                  <td>{route.id}</td>
                  <td>
                    <Link href={`/master/approval/edit/${route.id}`} className="text-primary">
                      {route.name}
                    </Link>
                  </td>
                  <td>
                    {route.steps.map((step: any, i: number) => {
                      const parts = [];
                      if (step.position_name) parts.push(step.position_name);
                      if (step.department_name) parts.push(step.department_name);
                      const label = parts.length ? `（${parts.join(' / ')}）` : '';

                      return (
                        <div key={i} className="mb-1">
                          <strong>ステップ{step.step_number}：</strong>{' '}
                          {getStepTypeLabel(step.step_type)} {label}
                        </div>
                      );
                    })}
                  </td>
                  <td>{formatDate(route.created_at)}</td>
                  <td>{formatDate(route.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
