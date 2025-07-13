'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDepartments, Department } from '@/src/features/department/api/departmentApi';
import { getUsers, User } from '@/src/features/user/api/userApi';
import { POSITIONS } from '@/src/features/user/types';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function UserListPage() {
  // 検索用state
  const [searchUsername, setSearchUsername] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchDepartment, setSearchDepartment] = useState('');
  const [searchPosition, setSearchPosition] = useState('');
  // データ
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message');

  // 部門一覧取得
  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  // 検索条件に応じてデータ取得
  useEffect(() => {
    setLoading(true);
    getUsers({
      username: searchUsername,
      email: searchEmail,
      department_id: searchDepartment,
      position: searchPosition,
    })
      .then(setUsers)
      .finally(() => setLoading(false));
  }, [searchUsername, searchEmail, searchDepartment, searchPosition]);

  // メッセージ
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        // クエリパラメータを消す
        router.replace('/master/user', { scroll: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, router]);

  // 日付フォーマット
  const formatDate = (dateStr: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : '';

  return (
    <div>
      {message && (
        <div className="alert alert-primary" role="alert">
          {message}
        </div>
      )}
      <h1 className="mb-4">社員一覧</h1>
      {/* 検索フォーム */}
      <div className="card mb-4">
        <div className="card-body">
          <form
            className="mb-4 row g-3 align-items-end"
            onSubmit={e => e.preventDefault()}
          >
            <div className="col-md-3">
              <label htmlFor="searchUsername" className="form-label">氏名</label>
              <input
                type="text"
                id="searchUsername"
                className="form-control"
                value={searchUsername}
                onChange={e => setSearchUsername(e.target.value)}
                placeholder="氏名で検索"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="searchEmail" className="form-label">メールアドレス</label>
              <input
                type="text"
                id="searchEmail"
                className="form-control"
                value={searchEmail}
                onChange={e => setSearchEmail(e.target.value)}
                placeholder="メールアドレスで検索"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="searchDepartment" className="form-label">所属部門</label>
              <select
                id="searchDepartment"
                className="form-select"
                value={searchDepartment}
                onChange={e => setSearchDepartment(e.target.value)}
              >
                <option value="">すべて</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="searchPosition" className="form-label">役職</label>
              <select
                id="searchPosition"
                className="form-select"
                value={searchPosition}
                onChange={e => setSearchPosition(e.target.value)}
              >
                <option value="">すべて</option>
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>{pos.label}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
      </div>
      <div className="mb-3">
        <Button
          component={Link}
          href="/master/user/add"
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
              <th>氏名</th>
              <th>Email</th>
              <th>所属部門</th>
              <th>役職</th>
              <th>マスター管理権限</th>
              <th>登録日</th>
              <th>更新日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center">読み込み中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">データがありません</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <Link href={`/master/user/edit/${user.id}`} className="text-primary">
                      {user.username}
                    </Link>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {departments.find(dep => dep.id === user.department)?.name ?? ''}
                  </td>
                  <td>
                    {POSITIONS.find(pos => pos.value === user.position)?.label ?? user.position}
                  </td>
                  <td>
                    {user.has_master_permission ? 'あり' : 'なし'}
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>{formatDate(user.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
