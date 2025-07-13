'use client';

import AllowanceForm from '@/src/features/allowance/components/AllowanceForm';
import { createAllowance } from '@/src/features/allowance/api/allowanceApi';
import { useRouter } from 'next/navigation';

export default function AllowanceAddPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-4">手当登録</h1>
      <AllowanceForm
        onSubmit={async (data) => {
          await createAllowance(data);
          router.push('/master/allowance?message=登録が完了しました');
        }}
        submitLabel="登録"
      />
    </div>
  );
}
