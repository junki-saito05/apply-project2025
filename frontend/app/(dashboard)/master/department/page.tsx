'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDepartments, getDivisions, Department, Division } from '@/src/features/department/api/departmentApi';
import { DEPARTMENT_LEVELS } from '@/src/features/department/types';

export default function DepartmentListPage() {
  // 検索用state
  const [searchName, setSearchName] = useState('');
  const [searchLevel, setSearchLevel] = useState('');
  const [searchDivision, setSearchDivision] = useState('');
  // データ
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message');

  // 検索条件に応じてデータ取得
  useEffect(() => {
    setLoading(true);
    getDepartments({ name: searchName, level: searchLevel, division: searchDivision })
      .then(setDepartments)
      .finally(() => setLoading(false));
  }, [searchName, searchLevel, searchDivision]);

  // 上位事業部リスト取得
  useEffect(() => {
    getDivisions().then(setDivisions);
  }, []);

  // メッセージ
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        // クエリパラメータを消す
        router.replace('/master/department', { scroll: false });
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
      <h1 className="mb-4">部門一覧</h1>
      {/* 検索フォーム */}
      <div className="card mb-4">
        <div className="card-body">
          <form
            className="mb-4 row g-3 align-items-end"
            onSubmit={e => { e.preventDefault(); }}
          >
            <div className="col-md-4">
              <label htmlFor="searchName" className="form-label">部門名</label>
              <input
                type="text"
                id="searchName"
                className="form-control"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="部門名で検索"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="searchLevel" className="form-label">階層</label>
              <select
                id="searchLevel"
                className="form-select"
                value={searchLevel}
                onChange={e => setSearchLevel(e.target.value)}
              >
                <option value="">すべて</option>
                {DEPARTMENT_LEVELS.map(lv => (
                  <option key={lv.value} value={lv.value}>{lv.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="searchDivision" className="form-label">上位事業部</label>
              <select
                id="searchDivision"
                className="form-select"
                value={searchDivision}
                onChange={e => setSearchDivision(e.target.value)}
              >
                <option value="">すべて</option>
                {divisions.map(div => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>
          </form>
        </div>
      </div>
      <div className="mb-3">
        <Link href="/master/department/add" className="btn btn-info justify-content-start col-2">
          新規登録
        </Link>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>ID</th>
              <th>部門名</th>
              <th>階層</th>
              <th>上位事業部</th>
              <th>登録日</th>
              <th>更新日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center">読み込み中...</td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">データがありません</td>
              </tr>
            ) : (
              departments.map(dep => (
                <tr key={dep.id}>
                  <td>{dep.id}</td>
                  <td>
                    <Link href={`/master/department/edit/${dep.id}`} className="text-primary">
                      {dep.name}
                    </Link>
                  </td>
                  <td>{DEPARTMENT_LEVELS.find(lv => lv.value === dep.level)?.label ?? dep.level}</td>
                  <td>{dep.parent_name ?? ''}</td>
                  <td>{formatDate(dep.created_at)}</td>
                  <td>{formatDate(dep.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
