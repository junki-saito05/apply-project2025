'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ApprovalForm from '@/src/features/approval/components/approvalForm';
import { getApproval, updateApproval, deleteApproval } from '@/src/features/approval/api/approvalApi';
import { ApprovalRoute, ApprovalFormValues, ApprovalStep } from '@/src/features/approval/types';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * APIで取得した ApprovalRoute を ApprovalFormValues に変換
 */
export const convertToFormValues = (data: ApprovalRoute): ApprovalFormValues => {
  return {
    name: data.name,
    description: data.description ?? '',
    steps: data.steps.map((step): ApprovalStep => ({
      step_number: step.step_number,
      step_type: step.step_type,
      position: step.position as ApprovalStep['position'],
      department_id: step.department_id,
    })),
  };
};

export default function ApprovalEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const [approval, setApproval] = useState<ApprovalRoute | null>(null);
  const [formData, setFormData] = useState<ApprovalFormValues | null>(null);

  const handleDelete = async () => {
    if (window.confirm('本当に削除しますか？')) {
      await deleteApproval(id);
      router.push('/master/approval?message=削除が完了しました');
    }
  };

  useEffect(() => {
    getApproval(id).then(data => {
      setApproval(data);
      setFormData(convertToFormValues(data));
    });
  }, [id]);

  if (!formData) return <div>読み込み中...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-4">承認ルート編集</h1>
        <Button
          variant="contained"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={handleDelete}
        >
          削除
        </Button>
      </div>
      <ApprovalForm
        initialData={formData}
        onSubmit={async (data) => {
          await updateApproval(id, data);
          router.push('/master/approval?message=変更が完了しました');
        }}
        submitLabel="変更"
      />
    </div>
  );
}
