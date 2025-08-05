'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import TripPreApplySearchBox from '@/src/features/trip/components/TripPreApplySearchBox';
import { BusinessTripRequest, BusinessTripRequestListItem, PRE_APPLY_STATUS, SearchValues } from '@/src/features/trip/types';
import Link from 'next/link';
import { getTripApplies } from '@/src/features/trip/api/tripApplyApi';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

export default function TripPreApplyListPage() {
  // 検索用state
  const [searchValues, setSearchValues] = useState({
    status: '', title: '', applicant: '', destination: ''
  });

  const handleAutoSearch = useCallback(async (params: SearchValues) => {
    setLoading(true);
    try {
      const data = await getTripApplies(params);
      setTripApplies(data);
    } catch (error) {
      console.error('検索失敗', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const { data: session } = useSession();
  const [tripApplies, setTripApplies] = useState<BusinessTripRequestListItem[]>([]);
  const [requests, setRequests] = useState<BusinessTripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get('message');

  // メッセージ
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        router.replace('/trip/pre-apply', { scroll: false });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, router]);

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
    <div>
      {message && (
        <div className="alert alert-primary" role="alert">
          {message}
        </div>
      )}
      <h1 className="mb-4">出張事前申請一覧</h1>
      {/* 検索フォーム */}
      <TripPreApplySearchBox
        searchValues={searchValues}
        setSearchValues={setSearchValues}
        onAutoSearch={handleAutoSearch}
      />
      <div className="mb-3">
        <Button
          component={Link}
          href="/trip/pre-apply/add"
          variant="contained"
          endIcon={<AddIcon />}
          className="btn btn-info justify-content-start"
        >
          新規申請
        </Button>
      </div>
      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-light">
            <tr>
              <th>ステータス</th>
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
              <tr>
                <td colSpan={9} className="text-center">読み込み中...</td>
              </tr>
            ) : tripApplies.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center">データがありません</td>
              </tr>
            ) : (
              tripApplies.map(req => (
                <tr key={req.id}>
                  <td>{PRE_APPLY_STATUS[req.status]}</td>
                  <td>{req.id}</td>
                  <td>
                    <Link href={`/trip/pre-apply/edit/${req.id}`} className="text-primary">
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
    </div>
  );
}
