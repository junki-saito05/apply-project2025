import { getSession } from "next-auth/react";

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

export type Division = { id: number; name: string };
export type Department = {
  id: number;
  name: string;
  level: number;
  parent: number | null;
  parent_name: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * 部門一覧情報取得
 */
export async function getDepartments(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${djangoApiUrl}/api/departments/get/department/?${query}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error('部門取得に失敗しました');
  return res.json();
}

/**
 * 事業部取得
 */
export async function getDivisions(): Promise<Division[]> {
  const res = await fetch(`${djangoApiUrl}/api/departments/get/division/`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error('事業部取得に失敗しました');
  return res.json();
}

/**
 * 変更画面表示時の部門情報取得
 */
export async function getDepartment(id: number): Promise<Department> {
  const res = await fetch(`${djangoApiUrl}/api/departments/get/department/${id}/`);
  if (!res.ok) throw new Error('部門情報の取得に失敗しました');
  return res.json();
}

/**
 * 部門情報登録
 */
export async function createDepartment(data: { name: string; level: number; parent?: number | null }) {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/departments/add/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('部門情報の作成に失敗しました');
  }
  return res.json();
}

/**
 * 部門情報更新
 * @param id 部門ID
 * @param data 更新データ
 * @returns Promise<Department>
 */
export async function updateDepartment(
  id: number,
  data: { name: string; level: number; parent?: number | null }
): Promise<Department> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/departments/update/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('部門情報の更新に失敗しました');
  return res.json();
}

/**
 * 部門削除
 */
export async function deleteDepartment(id: number): Promise<void> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/departments/delete/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('部門の削除に失敗しました');
}
