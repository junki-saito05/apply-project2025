import { getSession } from "next-auth/react";

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
 * ユーザのセッション情報からアクセストークンを取得するヘルパー
 */
export async function getAuthHeaders() {
  const session = await getSession();
  if (!session?.access) throw new Error('ログイン情報がありません');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access}`,
  };
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
