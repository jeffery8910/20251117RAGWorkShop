"use client";
import { useState } from 'react';
import Button from './Button';

interface TestPanelProps {
  question: string;
  answer: string;
  onQuestionChange: (question: string) => void;
  onTest: () => Promise<void>;
  loading: boolean;
}

export default function TestPanel({
  question,
  answer,
  onQuestionChange,
  onTest,
  loading
}: TestPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          測試問題
        </label>
        <input
          type="text"
          value={question}
          onChange={e => onQuestionChange(e.target.value)}
          placeholder="請輸入一個測試問題..."
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onTest}
          loading={loading}
          disabled={loading || !question.trim()}
        >
          {loading ? '生成中…' : '送出測試'}
        </Button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          回覆
        </label>
        <textarea
          rows={6}
          value={answer}
          readOnly
          placeholder="測試結果將顯示在這裡..."
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 resize-none"
        />
      </div>
    </div>
  );
}
