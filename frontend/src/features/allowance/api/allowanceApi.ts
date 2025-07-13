import { getSession } from "next-auth/react";

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

export type AllowanceMaster = {
  id: number;
  name: string;
  amount: number;
  condition: number;
  time: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * 手当一覧情報取得
 */
export async function getAllowances(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${djangoApiUrl}/api/allowances/get/allowance/?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error('手当取得に失敗しました');
  return res.json();
}

/**
 * 変更画面表示時の手当情報取得
 */
export async function getAllowance(id: number): Promise<AllowanceMaster> {
  const res = await fetch(`${djangoApiUrl}/api/allowances/get/allowance/${id}/`);
  if (!res.ok) throw new Error('手当情報の取得に失敗しました');
  return res.json();
}

/**
 * 手当情報登録
 */
export async function createAllowance(data: {
  name: string;
  condition: number;
  time: string | null;
  amount: number;
  is_active: boolean;
}) {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/allowances/add/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('手当情報の作成に失敗しました');
  }
  return res.json();
}

/**
 * 手当情報更新
 * @param id 手当ID
 * @param data 更新データ
 * @returns Promise<AllowanceMaster>
 */
export async function updateAllowance(
  id: number,
  data: {
    name: string;
    condition: number;
    time: string | null;
    amount: number;
    is_active: boolean;
  }
): Promise<AllowanceMaster> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/allowances/update/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('手当情報の更新に失敗しました');
  return res.json();
}

/**
 * 手当削除
 */
export async function deleteAllowance(id: number): Promise<void> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/allowances/delete/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('手当の削除に失敗しました');
}
