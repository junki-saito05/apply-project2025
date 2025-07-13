'use client';

import UserForm from '@/src/features/user/components/UserForm';
import { createUser } from '@/src/features/user/api/userApi';
import { useRouter } from 'next/navigation';

export default function UserAddPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-4">社員登録</h1>
      <UserForm
        onSubmit={async (data) => {
          await createUser(data);
          router.push('/master/user?message=登録が完了しました');
        }}
        submitLabel="登録"
        isEdit={false}
      />
    </div>
  );
}
