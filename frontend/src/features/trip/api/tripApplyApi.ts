import { getSession } from "next-auth/react";
import { BusinessTripRequestListItem } from '@/src/features/trip/types';
import { TripApplyFormValues } from '@/src/features/trip/types';
import type { TripPreApplyDetail } from '@/src/features/trip/types';

const djangoApiUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL;
const ODPT_API_KEY = process.env.NEXT_PUBLIC_ODPT_API_KEY as string;

// TODO:駅検索による運賃取得はまだできてない
type Station = {
  id: string;
  title: string;
};

let stationCache: Station[] | undefined = undefined;

/**
 * 全駅一覧を取得
 */
export async function getAllStations(): Promise<Station[]> {
  if (stationCache !== undefined) {
    const cache: Station[] = stationCache;
    return cache;
  }

  const res = await fetch(`https://api.odpt.org/api/v4/odpt:Station?acl:consumerKey=${ODPT_API_KEY}`);
  const data = await res.json();

  stationCache = data.map((station: any) => ({
    // id: station['@id'],
    id: station['owl:sameAs'],
    title: station['dc:title'],
  }));

  return stationCache;
}

/**
 * 駅名からIDを検索
 */
export async function findStationIdByName(name: string): Promise<string | null> {
  const stations = await getAllStations();
  const station = stations.find((s) => s.title === name);
  return station?.id ?? null;
}

/**
 * 駅間の金額を取得
 */
export async function fetchFareAmount(fromName: string, toName: string): Promise<number> {
  const fromId = await findStationIdByName(fromName);
  const toId = await findStationIdByName(toName);

  console.log("fromId:", fromId);
  console.log("toId:", toId);
  if (!fromId || !toId) throw new Error("駅IDの取得に失敗しました");

  const res = await fetch(
    `https://api.odpt.org/api/v4/odpt:RailwayFare?odpt:fromStation=${fromId}&odpt:toStation=${toId}&acl:consumerKey=${ODPT_API_KEY}`
  );
  const data = await res.json();

  // 金額が取得できなかった場合も考慮
  const fare = data[0]?.['odpt:fare'];
  if (fare == null) throw new Error("金額データが存在しません");

  return fare;
}

/**
 * 出張事前申請一覧情報取得
 */
export async function getTripApplies(
  extraParams: Record<string, string | undefined> = {}
): Promise<BusinessTripRequestListItem[]> {
  const session = await getSession();
  const user = session?.user;

  if (!user) throw new Error('ログイン情報が取得できません');

  // 既存のログインユーザー情報もパラメータにセット
  const queryObject: Record<string, string> = {};
  if (user.position != null) queryObject.position = String(user.position);
  if (user.department_id != null) queryObject.department = String(user.department_id);

  console.log(user.department_id);
  // 検索条件(extraParams)を追加する
  Object.entries(extraParams).forEach(([key, val]) => {
    // 空文字やundefinedは飛ばす
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
 * ユーザのセッション情報からアクセストークンを取得するヘルパー
 */
async function getAuthHeaders() {
  const session = await getSession();
  if (!session?.access) throw new Error('ログイン情報がありません');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access}`,
  };
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
 * 承認ルート者の取得
 */
export async function getApproversName(id: number) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/departments/${id}/approvers/`, {
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || '承認ルート者の取得に失敗しました');
  }
  return data
}

/**
 * 承認処理
 */
export async function approveTripPreApply(
  id: number,
  comment: string
): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${djangoApiUrl}/api/businesstriprequests/${id}/approve/`, {
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

  const res = await fetch(`${djangoApiUrl}/api/businesstriprequests/${id}/reject/`, {
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
