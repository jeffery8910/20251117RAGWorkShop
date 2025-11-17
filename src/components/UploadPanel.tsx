"use client";
import { useState } from 'react';
import Button from './Button';
import Input from './Input';
import Info from './Info';

interface UploadPanelProps {
  files: File[];
  chunkSize: number;
  overlap: number;
  onFilesChange: (files: File[]) => void;
  onChunkSizeChange: (size: number) => void;
  onOverlapChange: (overlap: number) => void;
  onUpload: () => void;
  uploading: boolean;
  uploadProgress: number;
  uploadMessage: string;
  uploadReport: any;
}

export default function UploadPanel({
  files,
  chunkSize,
  overlap,
  onFilesChange,
  onChunkSizeChange,
  onOverlapChange,
  onUpload,
  uploading,
  uploadProgress,
  uploadMessage,
  uploadReport
}: UploadPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            選擇檔案（可多選）
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.md,.docx"
            multiple
            onChange={e => onFilesChange(Array.from(e.target.files || []))}
            className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
          />
          {files.length > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              已選擇 {files.length} 個檔案
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            分塊大小
            <Info text={'以"字元數"計算（不是 tokens）。中文多數 1 字 = 1 字元；emoji/少數符號可能算 2。建議 600–1000 字，太小上下文不足、太大速度變慢。詳見 docs/retrieval-parameters.md'}/>
          </label>
          <input
            type="number"
            value={chunkSize}
            onChange={e => onChunkSizeChange(Number(e.target.value))}
            min="100"
            max="2000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            重疊
            <Info text="相鄰分塊之間的重疊字數，避免句子被切開。建議為分塊大小的 10–20%。"/>
          </label>
          <input
            type="number"
            value={overlap}
            onChange={e => onOverlapChange(Number(e.target.value))}
            min="0"
            max="500"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-gray-500">
          說明：伺服器自動將檔案轉為文字並分塊後嵌入。支援 .pdf/.txt/.md/.docx；可一次上傳多檔，後端將串行處理以配合免費速率限制。
        </div>
        <Button
          variant="primary"
          onClick={onUpload}
          loading={uploading}
          disabled={uploading || files.length === 0}
        >
          {uploading ? '上傳中…' : '送出並寫入向量庫'}
        </Button>
      </div>

      {uploading && (
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">上傳進度</span>
            <span className="text-sm text-gray-400">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {uploadMessage}
          </p>
        </div>
      )}

      {uploadReport && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">上傳結果</h4>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{uploadReport.totalInserted || 0}</div>
              <div className="text-xs text-gray-500">總寫入</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {Array.isArray(uploadReport.results) ? uploadReport.results.length : 0}
              </div>
              <div className="text-xs text-gray-500">成功</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">
                {Array.isArray(uploadReport.errors) ? uploadReport.errors.length : 0}
              </div>
              <div className="text-xs text-gray-500">錯誤</div>
            </div>
          </div>

          {Array.isArray(uploadReport.results) && uploadReport.results.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-medium text-gray-400 mb-2">成功檔案</h5>
              <div className="space-y-1">
                {uploadReport.results.map((r: any, i: number) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-300">{r.file}</span>
                    <span className="text-green-400">{r.inserted} 分塊</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(uploadReport.errors) && uploadReport.errors.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-400 mb-2">錯誤檔案</h5>
              <div className="space-y-1">
                {uploadReport.errors.map((e: any, i: number) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">{e.file}</span>
                    </div>
                    <div className="text-red-400 text-xs mt-1">{e.error}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
