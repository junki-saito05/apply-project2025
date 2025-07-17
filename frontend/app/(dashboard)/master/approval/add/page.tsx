'use client';

import ApprovalForm from '@/src/features/approval/components/approvalForm';
import { createApproval } from '@/src/features/approval/api/approvalApi';
import { useRouter } from 'next/navigation';

export default function ApprovalAddPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-4">承認ルート登録</h1>
      <ApprovalForm
        onSubmit={async (data) => {
          await createApproval(data);
          router.push('/master/approval?message=登録が完了しました');
        }}
        submitLabel="登録"
      />
    </div>
  );
}
