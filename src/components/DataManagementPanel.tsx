"use client";
import { useState } from 'react';
import Button from './Button';
import Input from './Input';

interface DataManagementPanelProps {
  sources: string[];
  selectedSource: string;
  onSourceChange: (source: string) => void;
  onLoadSources: () => Promise<void>;
  onDeleteSource: () => Promise<void>;
  onReembedSource: () => Promise<void>;
  onClearCollection: () => Promise<void>;
  loading: boolean;
  managing: boolean;
}

export default function DataManagementPanel({
  sources,
  selectedSource,
  onSourceChange,
  onLoadSources,
  onDeleteSource,
  onReembedSource,
  onClearCollection,
  loading,
  managing
}: DataManagementPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            來源檔名
          </label>
          <select
            value={selectedSource}
            onChange={e => onSourceChange(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">（請選擇來源）</option>
            {sources.map((s, i) => (
              <option key={i} value={s}>{s}</option>
            ))}
          </select>
          
          <div className="flex justify-between items-center mt-3">
            <Button
              variant="secondary"
              onClick={onLoadSources}
              loading={loading}
              disabled={loading}
              size="sm"
            >
              {loading ? '刷新中…' : '重新整理來源'}
            </Button>
            <span className="text-xs text-gray-500">
              {loading ? '讀取來源中…' : `共 ${sources.length} 個來源`}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="danger"
            onClick={onDeleteSource}
            loading={managing}
            disabled={managing || !selectedSource}
            size="sm"
          >
            {managing ? '處理中…' : '刪除此來源'}
          </Button>
          
          <Button
            variant="secondary"
            onClick={onReembedSource}
            loading={managing}
            disabled={managing || !selectedSource}
            size="sm"
          >
            {managing ? '處理中…' : '重新嵌入此來源'}
          </Button>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-medium text-gray-300">清空向量集合</h4>
            <p className="text-xs text-gray-500 mt-1">
              將清空整個向量集合（或 Atlas docs 集合）。此動作無法還原。
            </p>
          </div>
          <Button
            variant="danger"
            onClick={onClearCollection}
            loading={managing}
            disabled={managing}
          >
            {managing ? '處理中…' : '清空集合'}
          </Button>
        </div>
      </div>
    </div>
  );
}
