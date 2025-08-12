'use client';

import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

type TripRequest = {
  id: number;
  status_display: string;
  title: string;
  request_user: { username: string };
  destination: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');
  const [pendingPreApplies, setPendingPreApplies] = useState([]);
  const [pendingApplies, setPendingApplies] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 権限のないページにアクセスした場合
    if (error) {
      const timer = setTimeout(() => {
        router.replace('/dashboard', { scroll: false });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

  useEffect(() => {
    if (session?.user) {
      setLoading(true);
      Promise.all([
        fetch(`${djangoApiUrl}/api/business-trip-apply/pending-pre-applies/`, {
          headers: {
            Authorization: `Bearer ${session.access}`,
          },
        }).then((r) => r.json()),
        fetch(`${djangoApiUrl}/api/business-trip-apply/pending-applies/`, {
          headers: {
            Authorization: `Bearer ${session.access}`,
          },
        }).then((r) => r.json()),
      ])
        .then(([preApplies, applies]) => {
          setPendingPreApplies(preApplies);
          setPendingApplies(applies);
        })
        .finally(() => setLoading(false));
    }
  }, [session]);

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>ログインしてください。</p>;
  }

  return <div>
    {error === 'no-permission' && (
      <div className="alert alert-danger" role="alert">
        権限がありません
      </div>
    )}
    {/* <h1>ダッシュボード</h1> */}
    <div className="mb-5">
      <h5>ようこそ、{session.user?.username}さん！</h5>
    </div>
    {pendingPreApplies.length > 0 && (
      <div className="mb-4">
        <h2>承認待ちの出張事前申請</h2>
        <RequestTable data={pendingPreApplies} loading={loading} type="pre-apply" />
      </div>
    )}

    {pendingApplies.length > 0 && (
      <div className="mb-4">
        <h2>承認待ちの出張精算申請</h2>
        <RequestTable data={pendingApplies} loading={loading} type="apply" />
      </div>
    )}
  </div>
    ;
}

function RequestTable({
  data,
  loading,
  type,
}: {
  data: TripRequest[];
  loading: boolean;
  type: "apply" | "pre-apply";
}) {
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
    <div className="table-responsive">
      <table className="table table-bordered align-middle">
        <thead className="table-light">
          <tr>
            {/* <th>ステータス</th> */}
            <th>ID</th>
            <th>タイトル</th>
            <th>申請者</th>
            <th>出張場所</th>
            <th>出発日</th>
            <th>到着日</th>
            <th>登録日</th>
            <th>更新日</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={9} className="text-center">読み込み中...</td></tr>
          ) : data.length === 0 ? (
            <tr><td colSpan={9} className="text-center">データがありません</td></tr>
          ) : (
            data.map(req => (
              <tr key={req.id}>
                {/* <td>{req.status_display}</td> */}
                <td>{req.id}</td>
                <td>
                  <Link href={`/trip/${type}/edit/${req.id}`} className="text-primary">
                    {req.title}
                  </Link>
                </td>
                <td>{req.request_user.username}</td>
                <td>{req.destination}</td>
                <td>{formatDate(req.start_date)}</td>
                <td>{formatDate(req.end_date)}</td>
                <td>{formatDate(req.created_at)}</td>
                <td>{formatDate(req.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
