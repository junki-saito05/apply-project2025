'use client';

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session) {
    return <p>ログインしてください。</p>;
  }

  return <div>
    <h1>ダッシュボード</h1>
    <p>ようこそ、{session.user?.username}さん！</p>
  </div>;
}
