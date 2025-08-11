import { getSession } from "next-auth/react";
import { getAuthHeaders } from './tripCommonApi';
import { BusinessTripRequestListItem } from '@/src/features/trip/types';
import { TripApplyFormValues } from '@/src/features/trip/types';
import type { TripPreApplyDetail } from '@/src/features/trip/types';

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;

/**
 * 出張事前申請一覧情報取得
 */
export async function getTripPreApplies(
  extraParams: Record<string, string | undefined> = {}
): Promise<BusinessTripRequestListItem[]> {
  const session = await getSession();
  const user = session?.user;

  if (!user) throw new Error('ログイン情報が取得できません');

  // 既存のログインユーザー情報もパラメータにセット
  const queryObject: Record<string, string> = {};
  if (user.position != null) queryObject.position = String(user.position);
  if (user.department_id != null) queryObject.department = String(user.department_id);

  // 検索条件
  Object.entries(extraParams).forEach(([key, val]) => {
    if (val && val.trim() !== '') {
      queryObject[key] = val;
    }
  });

  // URLクエリ作成
  const query = new URLSearchParams(queryObject).toString();

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_DJANGO_API_URL}/api/business-trip-requests/pre-apply/get/?${query}`,
    {
      headers: {
        Authorization: `Bearer ${session.access}`,
      },
    }
  );

  if (!res.ok) {
    throw new Error('取得に失敗しました');
  }

  return res.json();
}

/**
 * 出張事前申請登録
 */
export async function createTripPreApply(data: TripApplyFormValues) {
  const session = await getSession();
  if (!session?.access) {
    throw new Error('アクセストークンを取得できませんでした');
  }
  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/pre-apply/create/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access}`,
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
 * 申請詳細取得
 */
export async function getTripPreApplyDetail(id: number): Promise<TripPreApplyDetail> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/pre-apply/detail/${id}/`, {
    headers,
  });

  if (!res.ok) {
    throw new Error('申請情報の取得に失敗しました');
  }

  const data = await res.json();

  return data as TripPreApplyDetail;
}

/**
 * 承認処理
 */
export async function approveTripPreApply(
  id: number,
  comment: string
): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/approve/${id}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || '承認に失敗しました');
  }
}

/**
 * 却下処理
 */
export async function rejectTripPreApply(
  id: number,
  comment: string
): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/reject/${id}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ comment }),
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.detail || '却下に失敗しました');
  }
}

/**
 * 削除処理
 */
export async function deleteTripPreApply(id: number): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/pre-apply/delete/${id}/`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    throw new Error('削除に失敗しました');
  }
}

/**
 * 再申請処理
 */
export async function updateTripPreApply(id: number, data: any) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/pre-apply/update/${id}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('再申請失敗');
  return await res.json();
}

/**
 * 確認処理
 */
export async function confirmTripPreApply(id: number, comment: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${djangoApiUrl}/api/business-trip-requests/pre-apply/confirm/${id}/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    throw new Error('確認に失敗しました');
  }
  return res.json();
}
