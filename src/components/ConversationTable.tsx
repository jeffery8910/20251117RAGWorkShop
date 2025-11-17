"use client";
import { useState } from 'react';
import Button from './Button';

interface ConversationItem {
  id: string;
  ts: string;
  direction: string;
  type: string;
  userId?: string;
  text?: string;
}

interface ConversationTableProps {
  conversations: ConversationItem[];
  loading: boolean;
}

export default function ConversationTable({ conversations, loading }: ConversationTableProps) {
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

  const getDirectionColor = (direction: string) => {
    switch (direction.toLowerCase()) {
      case 'in': return 'text-blue-400';
      case 'out': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getDirectionText = (direction: string) => {
    switch (direction.toLowerCase()) {
      case 'in': return '接收';
      case 'out': return '發送';
      default: return direction;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'text': return 'text-gray-300';
      case 'image': return 'text-purple-400';
      case 'file': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return '-';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>載入對話記錄中…</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8">
        <div className="text-center text-gray-500">
          <p>沒有找到符合條件的對話記錄</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                時間
              </th>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                方向
              </th>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                類型
              </th>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                使用者
              </th>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                內容
              </th>
              <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {conversations.map((conversation, index) => (
              <tr 
                key={conversation.id || index} 
                className="hover:bg-gray-800/50 transition-colors"
              >
                <td className="py-4 px-6 text-sm text-gray-400 whitespace-nowrap">
                  {formatDate(conversation.ts)}
                </td>
                <td className="py-4 px-6 text-sm whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDirectionColor(conversation.direction)}`}>
                    {getDirectionText(conversation.direction)}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(conversation.type)}`}>
                    {conversation.type}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-400 whitespace-nowrap">
                  {conversation.userId || '-'}
                </td>
                <td className="py-4 px-6 text-sm text-gray-300 max-w-md">
                  <div className="whitespace-pre-wrap">
                    {truncateText(conversation.text || '')}
                  </div>
                </td>
                <td className="py-4 px-6 text-sm whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/admin/conversations/${encodeURIComponent(conversation.id)}`, '_blank')}
                  >
                    查看詳情
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-800 px-6 py-4 border-t border-gray-700">
        <div className="text-sm text-gray-400 text-center">
          共 {conversations.length} 條對話記錄
        </div>
      </div>
    </div>
  );
}
