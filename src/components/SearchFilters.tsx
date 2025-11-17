"use client";
import { useState } from 'react';
import Button from './Button';
import Input from './Input';

interface SearchFiltersProps {
  userId: string;
  channelId: string;
  keyword: string;
  fromDate: string;
  toDate: string;
  limit: number;
  onUserIdChange: (value: string) => void;
  onChannelIdChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onLimitChange: (value: number) => void;
  onSearch: () => void;
  loading: boolean;
}

export default function SearchFilters({
  userId,
  channelId,
  keyword,
  fromDate,
  toDate,
  limit,
  onUserIdChange,
  onChannelIdChange,
  onKeywordChange,
  onFromDateChange,
  onToDateChange,
  onLimitChange,
  onSearch,
  loading
}: SearchFiltersProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-6">搜尋篩選</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Input
          label="使用者 ID（可留空）"
          value={userId}
          onChange={e => onUserIdChange(e.target.value)}
          placeholder="LINE userId 可留空"
        />
        
        <Input
          label="Channel（可留空）"
          value={channelId}
          onChange={e => onChannelIdChange(e.target.value)}
          placeholder="user/group/room 或留空"
        />
        
        <Input
          label="數量"
          type="number"
          value={limit}
          onChange={e => onLimitChange(Number(e.target.value))}
          min="1"
          max="200"
        />
        
        <Input
          label="關鍵字"
          value={keyword}
          onChange={e => onKeywordChange(e.target.value)}
          placeholder="全文搜尋"
        />
        
        <Input
          label="起始時間（ISO）"
          value={fromDate}
          onChange={e => onFromDateChange(e.target.value)}
          placeholder="2025-01-01T00:00:00Z"
        />
        
        <Input
          label="結束時間（ISO）"
          value={toDate}
          onChange={e => onToDateChange(e.target.value)}
          placeholder="2025-12-31T23:59:59Z"
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onSearch}
          loading={loading}
          disabled={loading}
        >
          {loading ? '搜尋中…' : '搜尋對話'}
        </Button>
      </div>
    </div>
  );
}
