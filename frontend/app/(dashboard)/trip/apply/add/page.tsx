'use client';

import { useCallback } from 'react';
import TripApplyForm from '@/src/features/trip/components/tripApplyForm';
import { createTripApply } from '@/src/features/trip/api/tripApplyApi';
import { useRouter } from 'next/navigation';

export default function TripApplyAddPage() {
  const router = useRouter();
  // 戻る
  const handleBack = useCallback(() => router.back(), [router]);
  return (
    <div>
      <h1 className="mb-4">出張精算申請</h1>
      <TripApplyForm
        mode="applicant_edit"
        onBack={handleBack}
        onSubmit={async (data) => {
          await createTripApply(data);
          router.push('/trip/apply?message=申請が完了しました');
        }}
        submitLabel="申請"
      />
    </div>
  );
}
