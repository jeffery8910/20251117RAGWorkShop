"use client";
import { useState } from 'react';
import Button from './Button';

interface LogEntry {
  ts: string;
  type: string;
  q?: string;
  error?: string;
  hits?: any[];
}

interface LogsPanelProps {
  logs: LogEntry[];
  onLoadLogs: () => Promise<void>;
  loading: boolean;
}

export default function LogsPanel({
  logs,
  onLoadLogs,
  loading
}: LogsPanelProps) {
  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-300">系統日誌</h4>
        <Button
          variant="secondary"
          onClick={onLoadLogs}
          loading={loading}
          disabled={loading}
          size="sm"
        >
          {loading ? '載入中…' : '重新載入'}
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>暫無日誌記錄</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400">時間</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400">類型</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400">問題</th>
                <th className="text-left py-3 px-2 text-xs font-medium text-gray-400">摘要</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr 
                  key={index} 
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-2 text-xs text-gray-400">
                    {formatDate(log.ts)}
                  </td>
                  <td className="py-3 px-2 text-xs">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(log.type)}`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-300 max-w-xs truncate">
                    {log.q || '-'}
                  </td>
                  <td className="py-3 px-2 text-xs text-gray-400">
                    {log.error || (log.hits ? `${log.hits.length} hits` : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {logs.length > 0 && (
        <div className="text-xs text-gray-500 text-center">
          顯示最近 {logs.length} 條日誌記錄
        </div>
      )}
    </div>
  );
}
