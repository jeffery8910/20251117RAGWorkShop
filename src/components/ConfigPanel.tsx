"use client";
import Button from './Button';
import Input from './Input';
import Info from './Info';

type Config = { 
  prompt: string; 
  keywords: string[]; 
  TOPK: number; 
  SCORE_THRESHOLD: number; 
  NUM_CANDIDATES: number;
  forwardToN8nUrl?: string;
  forwardRule?: string;
};

interface ConfigPanelProps {
  config: Config;
  onConfigChange: (config: Config) => void;
  onSave: () => Promise<void>;
  loading: boolean;
}

export default function ConfigPanel({ 
  config, 
  onConfigChange, 
  onSave, 
  loading 
}: ConfigPanelProps) {
  const handleKeywordChange = (value: string) => {
    onConfigChange({
      ...config,
      keywords: value.split(',').map(s => s.trim()).filter(Boolean)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          系統回覆說明（Prompt）
        </label>
        <textarea
          rows={8}
          value={config.prompt}
          onChange={e => onConfigChange({ ...config, prompt: e.target.value })}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          placeholder="說明助理的角色、語氣與回答範圍，例如：\n你是本單位的客服助理，請參考知識庫內容，用繁體中文回答使用者問題。"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          關鍵字（啟動 RAG 的文字，不是 LINE 後台的關鍵字）
          <Info text={'這裡設定的是 cloud-app 自己判斷的關鍵字，用來決定什麼時候啟動 RAG 回答。LINE 官方帳號後台的「關鍵字自動回覆」請分開設定，若要交給 LINE 原生回覆，可以在 keywordRules 中設定 mode:"native"。'} />
        </label>
        <input
          type="text"
          value={config.keywords.join(',')}
          onChange={e => handleKeywordChange(e.target.value)}
          placeholder="例如：help, 課表, 報名"
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            TOPK 
            <Info text="每次檢索要取回多少筆文件來組成回答。數字越大越精準但越慢，建議 4～8。" />
          </label>
          <input
            type="number"
            value={config.TOPK}
            onChange={e => onConfigChange({ ...config, TOPK: Number(e.target.value) })}
            min={1}
            max={20}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            SCORE_THRESHOLD 
            <Info text="向量相似度門檻（0～1）。越高代表只接受非常相似的文件，建議 0.10～0.30。" />
          </label>
          <input
            type="number"
            step={0.01}
            value={config.SCORE_THRESHOLD}
            onChange={e => onConfigChange({ ...config, SCORE_THRESHOLD: Number(e.target.value) })}
            min={0}
            max={1}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            NUM_CANDIDATES 
            <Info text="向量搜尋時初步掃描的候選文件數量。數字越大越精準但越耗資源，建議 200～800。" />
          </label>
          <input
            type="number"
            value={config.NUM_CANDIDATES}
            onChange={e => onConfigChange({ ...config, NUM_CANDIDATES: Number(e.target.value) })}
            min={50}
            max={2000}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="border-t border-gray-800 pt-4 mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            n8n Webhook URL（FORWARD_TO_N8N_URL）
            <Info text="若希望由 n8n workflow 處理 LINE 訊息，請填入 n8n 的 Webhook URL，例如 https://your-n8n.onrender.com/webhook/line/webhook。留白代表不啟用轉發，由 cloud-app 直接執行 RAG 回覆。" />
          </label>
          <input
            type="text"
            value={config.forwardToN8nUrl || ''}
            onChange={e => onConfigChange({ ...config, forwardToN8nUrl: e.target.value })}
            placeholder="https://your-n8n-host/webhook/line/webhook"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            n8n 轉發規則（FORWARD_RULE）
            <Info text='all：所有訊息都轉發到 n8n，由 n8n 回覆 LINE。keywords：只有命中關鍵字規則的訊息才轉發，其餘在 cloud-app 直接用 RAG 回覆。' />
          </label>
          <select
            value={config.forwardRule || ''}
            onChange={e => onConfigChange({ ...config, forwardRule: e.target.value })}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">不轉發到 n8n（全部由 cloud-app 處理）</option>
            <option value="all">all：所有 LINE 訊息都交給 n8n</option>
            <option value="keywords">keywords：只有關鍵字命中的才交給 n8n</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={onSave}
          loading={loading}
          disabled={loading}
        >
          {loading ? '儲存中…' : '儲存設定'}
        </Button>
      </div>
    </div>
  );
}

