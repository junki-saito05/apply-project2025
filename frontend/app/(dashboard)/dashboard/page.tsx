'use client';

import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get('error');

  useEffect(() => {
    // 権限のないページにアクセスした場合
    if (error) {
      const timer = setTimeout(() => {
        router.replace('/dashboard', { scroll: false });
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [error, router]);

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
    <h1>ダッシュボード</h1>
    <p>ようこそ、{session.user?.username}さん！</p>
  </div>;
}
