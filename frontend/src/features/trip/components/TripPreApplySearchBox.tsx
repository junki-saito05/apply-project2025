import React, { useEffect, useState } from 'react';
import { PRE_APPLY_STATUS, SearchValues } from '@/src/features/trip/types';

const DEBOUNCE_INTERVAL = 300;

type Props = {
  searchValues: SearchValues;
  setSearchValues: React.Dispatch<React.SetStateAction<SearchValues>>;
  onAutoSearch: (debouncedSearch: SearchValues) => void;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default function TripPreApplySearchBox({
  searchValues,
  setSearchValues,
  onAutoSearch,
}: Props) {
  const debouncedSearch = useDebounce(searchValues, DEBOUNCE_INTERVAL);

  useEffect(() => {
    onAutoSearch(debouncedSearch);
  }, [debouncedSearch, onAutoSearch]);

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="mb-4 row g-3 align-items-end">
          <div className="col-md-3">
            <label htmlFor="searchStatus" className="form-label">ステータス</label>
            <select
              id="searchStatus"
              className="form-select"
              value={searchValues.status}
              onChange={e => setSearchValues({ ...searchValues, status: e.target.value })}
            >
              <option value="">すべて</option>
              {Object.entries(PRE_APPLY_STATUS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="col-md-3">
            <label htmlFor="searchTitle" className="form-label">タイトル</label>
            <input
              type="text"
              id="searchTitle"
              className="form-control"
              placeholder="タイトルで検索"
              value={searchValues.title}
              onChange={e => setSearchValues({ ...searchValues, title: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <label htmlFor="searchApplicant" className="form-label">申請者</label>
            <input
              type="text"
              id="searchApplicant"
              className="form-control"
              placeholder="申請者名で検索"
              value={searchValues.applicant}
              onChange={e => setSearchValues({ ...searchValues, applicant: e.target.value })}
            />
          </div>

          <div className="col-md-3">
            <label htmlFor="searchDestination" className="form-label">出張場所</label>
            <input
              type="text"
              id="searchDestination"
              className="form-control"
              placeholder="出張場所で検索"
              value={searchValues.destination}
              onChange={e => setSearchValues({ ...searchValues, destination: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
