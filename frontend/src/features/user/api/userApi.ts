import { getSession } from "next-auth/react";

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

export type User = {
  id: number;
  username: string;
  email: string;
  department: number;
  position: number;
  has_master_permission: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * 社員一覧情報取得
 */
export async function getUsers(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${djangoApiUrl}/api/users/get/user/?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error('社員取得に失敗しました');
  return res.json();
}

/**
 * 変更画面表示時の社員情報取得
 */
export async function getUser(id: number): Promise<User> {
  const res = await fetch(`${djangoApiUrl}/api/users/get/user/${id}/`);
  if (!res.ok) throw new Error('社員情報の取得に失敗しました');
  return res.json();
}

/**
 * 社員情報登録
 */
export async function createUser(data: {
  username: string;
  email: string;
  password: string;
  department_id: number;
  position: number;
  has_master_permission: 0 | 1;
}) {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/users/add/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('社員情報の作成に失敗しました');
  }
  return res.json();
}

/**
 * 社員情報更新
 * @param id 社員ID
 * @param data 更新データ
 * @returns Promise<User>
 */
export async function updateUser(
  id: number,
  data: {
    username: string;
    email: string;
    password: string;
    department_id: number;
    position: number;
    has_master_permission: 0 | 1;
  }
): Promise<User> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/users/update/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('社員情報の更新に失敗しました');
  return res.json();
}

/**
 * 社員削除
 */
export async function deleteUser(id: number): Promise<void> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/users/delete/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('社員の削除に失敗しました');
}
