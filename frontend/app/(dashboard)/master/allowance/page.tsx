'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAllowances, AllowanceMaster } from '@/src/features/allowance/api/allowanceApi';
import { CONDITIONS } from '@/src/features/allowance/types';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export default function AllowanceListPage() {
  // 検索用state
  const [searchName, setSearchName] = useState('');
  const [searchCondition, setSearchCondition] = useState('');
  const [searchActive, setSearchActive] = useState('');
  // データ
  const [allowances, setAllowances] = useState<AllowanceMaster[]>([]);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message');

  // 検索条件に応じてデータ取得
  useEffect(() => {
    setLoading(true);
    getAllowances({
      name: searchName,
      condition: searchCondition,
      is_active: searchActive,
    })
      .then(setAllowances)
      .finally(() => setLoading(false));
  }, [searchName, searchCondition, searchActive]);

  // メッセージ
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        router.replace('/master/allowance', { scroll: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, router]);

  // 日付フォーマット
  const formatDate = (dateStr: string) =>
    dateStr
      ? new Date(dateStr)
        .toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .replace(/\//g, '/')
      : '';

  return (
    <div>
      {message && (
        <div className="alert alert-primary" role="alert">
          {message}
        </div>
      )}
      <h1 className="mb-4">手当一覧</h1>
      {/* 検索フォーム */}
      <div className="card mb-4">
        <div className="card-body">
          <form
            className="mb-4 row g-3 align-items-end"
            onSubmit={e => {
              e.preventDefault();
            }}
          >
            <div className="col-md-4">
              <label htmlFor="searchName" className="form-label">
                手当名
              </label>
              <input
                type="text"
                id="searchName"
                className="form-control"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                placeholder="手当名で検索"
              />
            </div>
            <div className="col-md-3">
              <label htmlFor="searchCondition" className="form-label">
                適用条件
              </label>
              <select
                id="searchCondition"
                className="form-select"
                value={searchCondition}
                onChange={e => setSearchCondition(e.target.value)}
              >
                <option value="">すべて</option>
                {CONDITIONS.map(cond => (
                  <option key={cond.value} value={cond.value}>
                    {cond.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label htmlFor="searchActive" className="form-label">
                アクティブ
              </label>
              <select
                id="searchActive"
                className="form-select"
                value={searchActive}
                onChange={e => setSearchActive(e.target.value)}
              >
                <option value="">すべて</option>
                <option value="true">アクティブ</option>
                <option value="false">非アクティブ</option>
              </select>
            </div>
          </form>
        </div>
      </div>
      <div className="mb-3">
        <Button
          component={Link}
          href="/master/allowance/add"
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
              <th>手当名</th>
              <th>適用条件</th>
              <th>時間</th>
              <th>金額</th>
              <th>アクティブ</th>
              <th>登録日</th>
              <th>更新日</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center">
                  読み込み中...
                </td>
              </tr>
            ) : allowances.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">
                  データがありません
                </td>
              </tr>
            ) : (
              allowances.map(allowance => (
                <tr key={allowance.id}>
                  <td>{allowance.id}</td>
                  <td>
                    <Link
                      href={`/master/allowance/edit/${allowance.id}`}
                      className="text-primary"
                    >
                      {allowance.name}
                    </Link>
                  </td>
                  <td>
                    {CONDITIONS.find(cond => cond.value === allowance.condition)?.label ??
                      allowance.condition}
                  </td>
                  <td>{allowance.time ? allowance.time.slice(0, 5) : ''}</td>
                  <td>{allowance.amount.toLocaleString()}円</td>
                  <td>
                    {allowance.is_active ? (
                      <span className="badge bg-success">アクティブ</span>
                    ) : (
                      ''
                    )}
                  </td>
                  <td>{formatDate(allowance.created_at)}</td>
                  <td>{formatDate(allowance.updated_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// import { useEffect, useState } from 'react';
// import { useSearchParams, useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { getAllowances, getDivisions, Allowance, Division } from '@/src/features/allowance/api/allowanceApi';
// import { Condition } from '@/src/features/allowance/types';
// import Button from '@mui/material/Button';
// import AddIcon from '@mui/icons-material/Add';

// export default function AllowanceListPage() {
//   // 検索用state
//   const [searchName, setSearchName] = useState('');
//   const [searchLevel, setSearchLevel] = useState('');
//   const [searchDivision, setSearchDivision] = useState('');
//   // データ
//   const [allowances, setAllowances] = useState<Allowance[]>([]);
//   const [divisions, setDivisions] = useState<Division[]>([]);
//   const [loading, setLoading] = useState(true);

//   const searchParams = useSearchParams();
//   const router = useRouter();
//   const message = searchParams.get('message');

//   // 検索条件に応じてデータ取得
//   useEffect(() => {
//     setLoading(true);
//     getAllowances({ name: searchName, level: searchLevel, division: searchDivision })
//       .then(setAllowances)
//       .finally(() => setLoading(false));
//   }, [searchName, searchLevel, searchDivision]);

//   // メッセージ
//   useEffect(() => {
//     if (message) {
//       const timer = setTimeout(() => {
//         // クエリパラメータを消す
//         router.replace('/master/allowance', { scroll: false });
//       }, 4000);
//       return () => clearTimeout(timer);
//     }
//   }, [message, router]);

//   // 日付フォーマット
//   const formatDate = (dateStr: string) =>
//     dateStr ? new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : '';

//   return (
//     <div>
//       {message && (
//         <div className="alert alert-primary" role="alert">
//           {message}
//         </div>
//       )}
//       <h1 className="mb-4">手当一覧</h1>
//       {/* 検索フォーム */}
//       <div className="card mb-4">
//         <div className="card-body">
//           <form
//             className="mb-4 row g-3 align-items-end"
//             onSubmit={e => { e.preventDefault(); }}
//           >
//             <div className="col-md-4">
//               <label htmlFor="searchName" className="form-label">手当名</label>
//               <input
//                 type="text"
//                 id="searchName"
//                 className="form-control"
//                 value={searchName}
//                 onChange={e => setSearchName(e.target.value)}
//                 placeholder="部門名で検索"
//               />
//             </div>
//             <div className="col-md-3">
//               <label htmlFor="searchLevel" className="form-label">適用条件</label>
//               <select
//                 id="searchLevel"
//                 className="form-select"
//                 value={searchLevel}
//                 onChange={e => setSearchLevel(e.target.value)}
//               >
//                 <option value="">すべて</option>
//                 {Condition.map(lv => (
//                   <option key={lv.value} value={lv.value}>{lv.label}</option>
//                 ))}
//               </select>
//             </div>
//             <div className="col-md-3">
//               <label htmlFor="searchDivision" className="form-label">アクティブ</label>
//               <select
//                 id="searchDivision"
//                 className="form-select"
//                 value={searchDivision}
//                 onChange={e => setSearchDivision(e.target.value)}
//               >
//                 <option value="">すべて</option>
//                 {divisions.map(div => (
//                   <option key={div.id} value={div.id}>{div.name}</option>
//                 ))}
//               </select>
//             </div>
//           </form>
//         </div>
//       </div>
//       <div className="mb-3">
//         <Button
//           component={Link}
//           href="/master/allowance/add"
//           variant="contained"
//           endIcon={<AddIcon />}
//           className="btn btn-info justify-content-start"
//         >
//           新規登録
//         </Button>
//       </div>
//       <div className="table-responsive">
//         <table className="table table-bordered align-middle">
//           <thead className="table-light">
//             <tr>
//               <th>ID</th>
//               <th>部門名</th>
//               <th>階層</th>
//               <th>上位事業部</th>
//               <th>登録日</th>
//               <th>更新日</th>
//             </tr>
//           </thead>
//           <tbody>
//             {loading ? (
//               <tr>
//                 <td colSpan={6} className="text-center">読み込み中...</td>
//               </tr>
//             ) : allowances.length === 0 ? (
//               <tr>
//                 <td colSpan={6} className="text-center">データがありません</td>
//               </tr>
//             ) : (
//               allowances.map(dep => (
//                 <tr key={dep.id}>
//                   <td>{dep.id}</td>
//                   <td>
//                     <Link href={`/master/allowance/edit/${dep.id}`} className="text-primary">
//                       {dep.name}
//                     </Link>
//                   </td>
//                   <td>{Condition.find(lv => lv.value === dep.level)?.label ?? dep.level}</td>
//                   <td>{dep.parent_name ?? ''}</td>
//                   <td>{formatDate(dep.created_at)}</td>
//                   <td>{formatDate(dep.updated_at)}</td>
//                 </tr>
//               ))
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
