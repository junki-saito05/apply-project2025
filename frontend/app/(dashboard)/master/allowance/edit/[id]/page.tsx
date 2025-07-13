'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AllowanceForm from '@/src/features/allowance/components/AllowanceForm';
import { getAllowance, updateAllowance, deleteAllowance } from '@/src/features/allowance/api/allowanceApi';
import type { AllowanceMaster } from '@/src/features/allowance/api/allowanceApi';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

export default function AllowanceEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const [initialData, setInitialData] = useState<AllowanceMaster | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm('本当に削除しますか？')) {
      await deleteAllowance(id);
      router.push('/master/allowance?message=削除が完了しました');
    }
  };

  useEffect(() => {
    getAllowance(id).then(setInitialData);
  }, [id]);

  if (!initialData) return <div>読み込み中...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-4">手当編集</h1>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          削除
        </Button>
      </div>
      <AllowanceForm
        initialData={initialData}
        onSubmit={async (data) => {
          await updateAllowance(id, data);
          router.push('/master/allowance?message=変更が完了しました');
        }}
        submitLabel="変更"
      />
    </div>
  );
}
