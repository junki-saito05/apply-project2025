'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@mui/material/Button';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { errorMessages } from '@/src/utils/messages';
import { POSITIONS, POSITION } from '@/src/features/user/types';
import { ApprovalFormValues, ApprovalStepForm, StepType, STEP_TYPES } from '../types';
import { Department, getDepartments } from '@/src/features/department/api/departmentApi';

type ApprovalFormProps = {
  initialData?: Partial<ApprovalFormValues>;
  onSubmit: (data: ApprovalFormValues) => Promise<void>;
  submitLabel?: string;
};

export default function ApprovalForm({
  initialData,
  onSubmit,
  submitLabel = '登録',
}: ApprovalFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [steps, setSteps] = useState<ApprovalStepForm[]>(
    initialData?.steps?.map((s, i) => ({
      step_number: s.step_number ?? i + 1,
      step_type: s.step_type ?? '',
      position: s.position ?? '',
      department_id: s.department_id ?? '',
    })) ?? [
      { step_number: 1, step_type: '', position: '', department_id: '' },
    ]
  );
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    getDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  const handleAddStep = () => {
    setSteps(prev => [
      ...prev,
      {
        step_number: prev.length + 1,
        step_type: '',
        position: '',
        department_id: '',
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index).map((step, i) => ({
      ...step,
      step_number: i + 1,
    }));
    setSteps(newSteps);
  };

  const updateStep = (
    index: number,
    field: keyof ApprovalStepForm,
    value: ApprovalStepForm[typeof field]
  ) => {
    const newSteps = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: value,
    };
    setSteps(newSteps);
  };

  const validate = () => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!name.trim()) {
      newErrors.name = errorMessages.required('承認ルート名');
    } else if (name.length > 30) {
      newErrors.name = errorMessages.maxLength('承認ルート名', 30);
    }

    if (description.length > 50) {
      newErrors.description = errorMessages.maxLength('説明', 50);
    }

    steps.forEach((step, index) => {
      if (!step.step_type) {
        newErrors[`step_type_${index}`] = errorMessages.required('ステップ種別');
      }

      if (step.position === '' && !step.department_id) {
        newErrors[`step_position_${index}`] = errorMessages.required('役職または部署');
        newErrors[`step_department_${index}`] = errorMessages.required('役職または部署');
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit({
        name,
        description,
        steps: steps.map(step => ({
          step_number: step.step_number,
          step_type: Number(step.step_type) as StepType,
          position: step.position === '' || step.position === null ? null : Number(step.position) as POSITION,
          department_id: step.department_id === '' || step.department_id === null ? null : Number(step.department_id),
        })),
      });
    } catch (err) {
      setError(`${submitLabel}に失敗しました`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">承認ルート名</label>
        <input
          className="form-control"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        {errors.name && <div className="text-danger">{errors.name}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label">説明（任意）</label>
        <input
          className="form-control"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        {errors.description && <div className="text-danger">{errors.description}</div>}
      </div>

      <h5 className="mt-4">承認ステップ</h5>
      {steps.map((step, index) => (
        <div key={index} className="border p-3 mb-3">
          <div className="row">
            <div className="col-6 d-flex justify-content-start">
              <strong>ステップ {index + 1}</strong>
            </div>
            <div className="col-6 d-flex justify-content-end">
              {steps.length > 1 && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleRemoveStep(index)}
                  startIcon={<DeleteIcon />}
                >
                  削除
                </Button>
              )}
            </div>
          </div>
          <div className="row">
            <div className="col-md-5 mb-2">
              <label className="form-label">役職</label>
              <select
                className="form-select"
                value={step.position ?? ''}
                onChange={e => updateStep(index, 'position', Number(e.target.value))}
              >
                <option value="">選択してください</option>
                {POSITIONS.map(pos => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
              {errors[`step_position_${index}`] && (
                <div className="text-danger">{errors[`step_position_${index}`]}</div>
              )}
            </div>
            <div className="col-md-5 mb-2">
              <label className="form-label">部署</label>
              <select
                className="form-select"
                value={step.department_id}
                onChange={e => updateStep(index, 'department_id', Number(e.target.value))}
              >
                <option value="">選択してください</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>
                    {dep.name}
                  </option>
                ))}
              </select>
              {errors[`step_department_${index}`] && (
                <div className="text-danger">{errors[`step_department_${index}`]}</div>
              )}
            </div>
          </div>
          <div className="row">
            <div className="col-md-5 mb-2">
              <label className="form-label">ステップ種別</label>
              <select
                className="form-select"
                value={step.step_type}
                onChange={e => updateStep(index, 'step_type', Number(e.target.value) as StepType)}
              >
                <option value="">選択してください</option>
                {STEP_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors[`step_type_${index}`] && (
                <div className="text-danger">{errors[`step_type_${index}`]}</div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="mb-3">
        <Button variant="outlined" onClick={handleAddStep} startIcon={<AddIcon />}>
          ステップを追加
        </Button>
      </div>

      {error && <div className="text-danger mb-3">{error}</div>}

      <div className="mb-3 row">
        <div className="col-6 d-flex justify-content-start">
          <Button
            component={Link}
            href="/master/approval"
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            className="btn btn-outline-secondary w-100 w-md-auto"
          >
            戻る
          </Button>
        </div>
        <div className="col-6 d-flex justify-content-end">
          <Button
            type="submit"
            variant="contained"
            color="primary"
            endIcon={<SaveIcon />}
            className="w-100 w-md-auto"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
