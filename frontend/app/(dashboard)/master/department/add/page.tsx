'use client';

import DepartmentForm from '@/src/features/department/components/DepartmentForm';
import { createDepartment } from '@/src/features/department/api/departmentApi';
import { useRouter } from 'next/navigation';

export default function DepartmentAddPage() {
  const router = useRouter();
  return (
    <div>
      <h1 className="mb-4">部門登録</h1>
      <DepartmentForm
        onSubmit={async (data) => {
          await createDepartment(data);
          router.push('/master/department?message=登録が完了しました');
        }}
        submitLabel="登録"
      />
    </div>
  );
}
