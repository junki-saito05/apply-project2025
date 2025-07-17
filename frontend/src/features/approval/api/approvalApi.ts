import { getSession } from "next-auth/react";
import { ApprovalFormValues, ApprovalRoute } from '../types';

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

/**
 * 承認ルート一覧情報取得
 */
export async function getApprovalRoutes(params?: {
  name?: string;
  position?: number;
  department?: number;
}): Promise<ApprovalRoute[]> {
  const session = await getSession();
  const queryObject: Record<string, string> = {};
  if (params?.name) queryObject.name = params.name;
  if (typeof params?.position === 'number') queryObject.position = String(params.position);
  if (typeof params?.department === 'number') queryObject.department = String(params.department);

  const query = new URLSearchParams(queryObject).toString();

  const res = await fetch(`${djangoApiUrl}/api/approvals/get/approval/?${query}`, {
    headers: {
      Authorization: `Bearer ${session?.access}`,
    },
  });
  if (!res.ok) throw new Error('取得に失敗しました');
  return res.json();
}

/**
 * 事業部取得
 */
// export async function getDivisions(): Promise<Division[]> {
//   const res = await fetch(`${djangoApiUrl}/api/approvals/get/division/`, {
//     method: "GET",
//     headers: { "Content-Type": "application/json" },
//   });
//   if (!res.ok) throw new Error('事業部取得に失敗しました');
//   return res.json();
// }

/**
 * 変更画面表示時の承認ルート情報取得
 */
export async function getApproval(id: number): Promise<ApprovalRoute> {
  const res = await fetch(`${djangoApiUrl}/api/approvals/get/approval/${id}/`);
  if (!res.ok) throw new Error('承認ルート情報の取得に失敗しました');
  return res.json();
}

/**
 * 承認ルート情報登録
 */
export async function createApproval(data: ApprovalFormValues) {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/approvals/add/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(JSON.stringify(err));
  }
  return res.json();
}

/**
 * 承認ルート情報更新
 * @param id 承認ルートID
 * @param data 更新データ
 * @returns Promise<Approval>
 */
export async function updateApproval(
  id: number,
  data: ApprovalFormValues
): Promise<ApprovalRoute> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }

  const res = await fetch(`${djangoApiUrl}/api/approvals/update/${id}/`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error('承認ルート情報の更新に失敗しました');
  return res.json();
}

/**
 * 承認ルート削除
 */
export async function deleteApproval(id: number): Promise<void> {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/approvals/delete/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${session.access}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('承認ルートの削除に失敗しました');
}
