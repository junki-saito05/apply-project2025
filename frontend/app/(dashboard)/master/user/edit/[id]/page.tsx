'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import UserForm from '@/src/features/user/components/UserForm';
import { getUser, updateUser, deleteUser } from '@/src/features/user/api/userApi';
import type { User, } from '@/src/features/user/api/userApi';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

export default function UserEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const [initialData, setInitialData] = useState<User | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm('本当に削除しますか？')) {
      await deleteUser(id);
      router.push('/master/user?message=削除が完了しました');
    }
  };

  useEffect(() => {
    getUser(id).then(setInitialData);
  }, [id]);

  if (!initialData) return <div>読み込み中...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-4">社員編集</h1>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          削除
        </Button>
      </div>
      <UserForm
        initialData={initialData}
        onSubmit={async (data) => {
          await updateUser(id, data);
          router.push('/master/user?message=変更が完了しました');
        }}
        submitLabel="変更"
        isEdit={true}
      />
    </div>
  );
}
