"use client";
import { useState } from 'react';
import Button from './Button';
import Info from './Info';

interface TextUploadPanelProps {
  docText: string;
  docSource: string;
  onDocTextChange: (text: string) => void;
  onDocSourceChange: (source: string) => void;
  onUpload: () => Promise<void>;
  loading: boolean;
}

export default function TextUploadPanel({
  docText,
  docSource,
  onDocTextChange,
  onDocSourceChange,
  onUpload,
  loading
}: TextUploadPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          來源檔名（會顯示於引用）
        </label>
        <input
          type="text"
          value={docSource}
          onChange={e => onDocSourceChange(e.target.value)}
          placeholder="輸入來源檔名..."
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          貼上教材內容（建議 .txt/.md）
          <Info text="此路徑使用預設切分參數：size=800、overlap=120（以字元數計算）。大型文件建議使用『檔案上傳』以自訂參數。"/>
        </label>
        <textarea
          rows={8}
          value={docText}
          onChange={e => onDocTextChange(e.target.value)}
          placeholder="貼上純文字；PDF 請先轉成文字檔。"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
        />
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          更多說明：<a 
            href="https://github.com/jeffery891010/RAGWorkshop/blob/main/docs/retrieval-parameters.md" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            檢索與切分參數指南
          </a>
        </div>
        <Button
          variant="primary"
          onClick={onUpload}
          loading={loading}
          disabled={loading || !docText.trim() || !docSource.trim()}
        >
          {loading ? '寫入中…' : '送出並寫入向量庫'}
        </Button>
      </div>
    </div>
  );
}
