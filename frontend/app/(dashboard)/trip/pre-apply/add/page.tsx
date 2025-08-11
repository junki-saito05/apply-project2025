'use client';

import { useCallback } from 'react';
import TripPreApplyForm from '@/src/features/trip/components/tripPreApplyForm';
import { createTripPreApply } from '@/src/features/trip/api/tripPreApplyApi';
import { useRouter } from 'next/navigation';

export default function TripPreApplyAddPage() {
  const router = useRouter();
  // 戻る
  const handleBack = useCallback(() => router.back(), [router]);
  return (
    <div>
      <h1 className="mb-4">出張事前申請</h1>
      <TripPreApplyForm
        mode="applicant_edit"
        onBack={handleBack}
        onSubmit={async (data) => {
          await createTripPreApply(data);
          router.push('/trip/pre-apply?message=申請が完了しました');
        }}
        submitLabel="申請"
      />
    </div>
  );
}
