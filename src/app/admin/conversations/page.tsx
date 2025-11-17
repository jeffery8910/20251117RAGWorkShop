"use client";
import { useEffect, useMemo, useState } from "react";
import Overlay from "@/components/Overlay";
import AdminGate from "../AdminGate";
import SearchFilters from "@/components/SearchFilters";
import ConversationTable from "@/components/ConversationTable";
import Toast from "@/components/Toast";

export default function ConversationsPage() {
  const [token, setToken] = useState("");
  const [userId, setUserId] = useState("");
  const [channelId, setChannelId] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [limit, setLimit] = useState(50);
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem("adminToken") || "");
  }, []);

  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (userId) qs.append("userId", userId);
      if (channelId) qs.append("channelId", channelId);
      if (q) qs.append("q", q);
      if (from) qs.append("from", from);
      if (to) qs.append("to", to);
      const res = await fetch(`/api/admin/conversations?${qs}`, {
        headers: { ...auth.headers },
      });
      if (!res.ok) {
        showToast("讀取失敗，請確認權限或稍後再試", "error");
        return;
      }
      const j = await res.json();
      setItems(j.conversations || []);
      if (j.conversations?.length > 0) {
        showToast(`成功載入 ${j.conversations.length} 筆對話紀錄`, "success");
      } else {
        showToast("目前沒有符合條件的對話紀錄", "info");
      }
    } catch (error) {
      showToast("讀取發生錯誤，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const showToast = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <AdminGate>
      <div className="space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">
                對話紀錄
              </h1>
              <p className="text-gray-400">
                查詢並檢視 LINE 對話紀錄（入站 / 出站訊息）
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/admin"
                className="text-green-400 hover:text-green-300 transition-colors flex items-center space-x-2"
              >
                <span>← 回到管理後台</span>
              </a>
            </div>
          </div>
        </div>

        <SearchFilters
          userId={userId}
          channelId={channelId}
          keyword={q}
          fromDate={from}
          toDate={to}
          limit={limit}
          onUserIdChange={setUserId}
          onChannelIdChange={setChannelId}
          onKeywordChange={setQ}
          onFromDateChange={setFrom}
          onToDateChange={setTo}
          onLimitChange={setLimit}
          onSearch={load}
          loading={loading}
        />

        <ConversationTable conversations={items} loading={loading} />
      </div>

      <Overlay show={loading} message="對話紀錄載入中..." />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AdminGate>
  );
}

