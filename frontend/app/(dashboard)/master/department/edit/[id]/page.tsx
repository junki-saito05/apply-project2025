'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DepartmentForm from '@/src/features/department/components/DepartmentForm';
import { getDepartment, updateDepartment, deleteDepartment } from '@/src/features/department/api/departmentApi';
import type { Department, } from '@/src/features/department/api/departmentApi';

export default function DepartmentEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const [initialData, setInitialData] = useState<Department | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (window.confirm('本当に削除しますか？')) {
      await deleteDepartment(id);
      router.push('/master/department?message=削除が完了しました');
    }
  };

  useEffect(() => {
    getDepartment(id).then(setInitialData);
  }, [id]);

  if (!initialData) return <div>読み込み中...</div>;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-4">部門編集</h1>
        <button className="btn btn-danger" onClick={handleDelete}>
          削除
        </button>
      </div>
      <DepartmentForm
        initialData={initialData}
        onSubmit={async (data) => {
          await updateDepartment(id, data);
          router.push('/master/department?message=変更が完了しました');
        }}
        submitLabel="変更"
      />
    </div>
  );
}
