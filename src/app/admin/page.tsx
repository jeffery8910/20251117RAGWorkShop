"use client";
import { useEffect, useMemo, useState } from "react";
import AdminGate from "./AdminGate";
import Overlay from "@/components/Overlay";
import Info from "@/components/Info";
import Tabs from "@/components/Tabs";
import ConfigPanel from "@/components/ConfigPanel";
import UploadPanel from "@/components/UploadPanel";
import TextUploadPanel from "@/components/TextUploadPanel";
import TestPanel from "@/components/TestPanel";
import DataManagementPanel from "@/components/DataManagementPanel";
import LogsPanel from "@/components/LogsPanel";
import AnalyticsPanel from "@/components/AnalyticsPanel";
import Toast from "@/components/Toast";

type Config = {
  prompt: string;
  keywords: string[];
  TOPK: number;
  SCORE_THRESHOLD: number;
  NUM_CANDIDATES: number;
  forwardToN8nUrl?: string;
  forwardRule?: string;
};

export default function AdminPage() {
  const [token, setToken] = useState<string>("");
  const [cfg, setCfg] = useState<Config>({
    prompt: "",
    keywords: [],
    TOPK: 6,
    SCORE_THRESHOLD: 0.1,
    NUM_CANDIDATES: 400,
    forwardToN8nUrl: "",
    forwardRule: "",
  });
  const [q, setQ] = useState("請輸入一個想測試的問題");
  const [answer, setAnswer] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const auth = useMemo(
    () => ({ headers: { Authorization: `Bearer ${token}` } }),
    [token]
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "warning" | "info";
  } | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("adminToken") || "";
    setToken(t);
    // 初始讀取設定（失敗就忽略）
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => {});
  }, []);

  const saveToken = () => {
    localStorage.setItem("adminToken", token);
    showToast("已儲存 Admin Token（僅保存在本機瀏覽器）", "success");
  };

  const [savingCfg, setSavingCfg] = useState(false);
  const saveConfig = async () => {
    try {
      setSavingCfg(true);
      const res = await fetch("/api/admin/config", {
        method: "PUT",
        headers: { "content-type": "application/json", ...auth.headers },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) return showToast("儲存設定失敗", "error");
      const j = await res.json();
      setCfg(j);
      showToast("設定已儲存", "success");
    } finally {
      setSavingCfg(false);
    }
  };

  const [pasting, setPasting] = useState(false);
  const uploadDoc = async (
    content: string,
    source: string,
    page?: number,
    section?: string
  ) => {
    try {
      setPasting(true);
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        headers: { "content-type": "application/json", ...auth.headers },
        body: JSON.stringify({ content, source, page, section }),
      });
      if (!res.ok) return showToast("上傳失敗", "error");
      const j = await res.json();
      showToast(`已寫入 ${j.inserted} 筆片段`, "success");
      // 上傳完成後刷新來源列表
      loadSources();
    } finally {
      setPasting(false);
    }
  };

  const [testing, setTesting] = useState(false);
  const runTest = async () => {
    setAnswer("");
    setTesting(true);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...auth.headers,
        },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) return setAnswer("測試失敗／權限不足");
      const j = await res.json();
      setAnswer(j.answer || "(目前沒有可用的回答)");
    } finally {
      setTesting(false);
    }
  };

  const [loadingLogs, setLoadingLogs] = useState(false);
  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await fetch("/api/admin/logs?limit=50", {
        headers: { ...auth.headers },
      });
      if (!res.ok) return showToast("讀取記錄失敗／權限不足", "error");
      const j = await res.json();
      setLogs(j.logs || []);
    } finally {
      setLoadingLogs(false);
    }
  };

  const [docText, setDocText] = useState("");
  const [docSource, setDocSource] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [chunkSize, setChunkSize] = useState(800);
  const [overlap, setOverlap] = useState(120);
  const [manageSource, setManageSource] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loadingSources, setLoadingSources] = useState(false);

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const res = await fetch("/api/admin/docs/sources", {
        headers: { ...auth.headers },
      });
      if (!res.ok) return;
      const j = await res.json();
      setSources(Array.isArray(j.sources) ? j.sources : []);
    } finally {
      setLoadingSources(false);
    }
  };
  useEffect(() => {
    if (token) loadSources();
  }, [token]);

  const [managing, setManaging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadReport, setUploadReport] = useState<any | null>(null);

  const uploadFiles = async () => {
    if (!files?.length) return showToast("請先選擇檔案", "warning");
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    fd.append("chunkSize", String(chunkSize));
    fd.append("overlap", String(overlap));
    setUploading(true);
    setUploadPct(0);
    setUploadMsg("開始上傳…");
    setUploadReport(null);
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/admin/docs/upload", true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setUploadPct(pct);
          setUploadMsg(
            `已上傳 ${(e.loaded / 1024 / 1024).toFixed(2)} MB / ${(e.total /
              1024 /
              1024
            ).toFixed(2)} MB`
          );
        } else {
          setUploadMsg("上傳中…");
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        setUploadMsg("網路錯誤，請稍後再試。");
        resolve();
      };
      xhr.onload = () => {
        setUploading(false);
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const j = JSON.parse(xhr.responseText || "{}");
            setUploadReport(j);
            const errList = (j.errors || []).map(
              (e: any) => `${e.file}：${e.error}`
            );
            setUploadMsg(
              `已寫入 ${j.totalInserted || 0} 筆片段。` +
                (errList.length ? ` 錯誤 ${errList.length} 筆。` : "")
            );
            loadSources();
          } else {
            setUploadMsg(
              `上傳失敗：${xhr.responseText || xhr.statusText || xhr.status}`
            );
          }
        } catch (e: any) {
          setUploadMsg(`解析回應失敗：${e?.message || e}`);
        }
        resolve();
      };
      xhr.send(fd);
    });
  };

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
                RAG ＋ LINE 管理後台
              </h1>
              <p className="text-gray-400">
                在這裡設定回覆策略、知識庫與（選用）n8n 工作流程，讓 LINE
                機器人能安全讀取你的文件並回覆使用者。
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="/admin/conversations"
                className="text-green-400 hover:text-green-300 transition-colors flex items-center space-x-2"
              >
                <span>查看對話紀錄</span>
              </a>
            </div>
          </div>
        </div>

        <Tabs
          tabs={[
            {
              id: "config",
              label: "系統設定",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <ConfigPanel
                    config={cfg}
                    onConfigChange={setCfg}
                    onSave={saveConfig}
                    loading={savingCfg}
                  />
                </div>
              ),
            },
            {
              id: "upload",
              label: "檔案上傳",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <UploadPanel
                    files={files}
                    chunkSize={chunkSize}
                    overlap={overlap}
                    onFilesChange={setFiles}
                    onChunkSizeChange={setChunkSize}
                    onOverlapChange={setOverlap}
                    onUpload={uploadFiles}
                    uploading={uploading}
                    uploadProgress={uploadPct}
                    uploadMessage={uploadMsg}
                    uploadReport={uploadReport}
                  />
                </div>
              ),
            },
            {
              id: "text-upload",
              label: "純文字上傳",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <TextUploadPanel
                    docText={docText}
                    docSource={docSource}
                    onDocTextChange={setDocText}
                    onDocSourceChange={setDocSource}
                    onUpload={() => uploadDoc(docText, docSource)}
                    loading={pasting}
                  />
                </div>
              ),
            },
            {
              id: "test",
              label: "線上測問",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <TestPanel
                    question={q}
                    answer={answer}
                    onQuestionChange={setQ}
                    onTest={runTest}
                    loading={testing}
                  />
                </div>
              ),
            },
            {
              id: "data-management",
              label: "資料管理",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <DataManagementPanel
                    sources={sources}
                    selectedSource={manageSource}
                    onSourceChange={setManageSource}
                    onLoadSources={loadSources}
                    onDeleteSource={async () => {
                      if (!manageSource)
                        return showToast("請先選擇來源名稱", "warning");
                      if (
                        !confirm(
                          `確定要刪除來源「${manageSource}」的所有文件嗎？此動作無法復原。`
                        )
                      )
                        return;
                      setManaging(true);
                      try {
                        const res = await fetch(
                          `/api/admin/docs?source=${encodeURIComponent(
                            manageSource
                          )}`,
                          { method: "DELETE", headers: { ...auth.headers } }
                        );
                        if (!res.ok)
                          return showToast("刪除失敗／權限不足", "error");
                        showToast("刪除成功", "success");
                        setManageSource("");
                        loadSources();
                      } finally {
                        setManaging(false);
                      }
                    }}
                    onReembedSource={async () => {
                      if (!manageSource)
                        return showToast("請先選擇來源名稱", "warning");
                      if (
                        !confirm(
                          `將重新計算來源「${manageSource}」所有文件的嵌入向量，可能需要一些時間，確定要開始嗎？`
                        )
                      )
                        return;
                      setManaging(true);
                      try {
                        const res = await fetch("/api/admin/docs/reembed", {
                          method: "POST",
                          headers: {
                            "content-type": "application/json",
                            ...auth.headers,
                          },
                          body: JSON.stringify({ source: manageSource }),
                        });
                        if (!res.ok)
                          return showToast("重算嵌入失敗／權限不足", "error");
                        const j = await res.json();
                        showToast(
                          `重算完成，共處理 ${j.reembedded} 筆文件`,
                          "success"
                        );
                      } finally {
                        setManaging(false);
                      }
                    }}
                    onClearCollection={async () => {
                      if (
                        !confirm(
                          "將清除整個向量集合（例如 Atlas docs / Qdrant collection）。請先確認已備份，確定要執行嗎？"
                        )
                      )
                        return;
                      setManaging(true);
                      try {
                        const res = await fetch("/api/admin/vector/clear", {
                          method: "POST",
                          headers: { ...auth.headers },
                        });
                        if (!res.ok)
                          return showToast("清除失敗／權限不足", "error");
                        showToast("向量集合已清空", "success");
                        setManageSource("");
                        loadSources();
                      } finally {
                        setManaging(false);
                      }
                    }}
                    loading={loadingSources}
                    managing={managing}
                  />
                </div>
              ),
            },
            {
              id: "logs",
              label: "記錄查詢",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <LogsPanel
                    logs={logs}
                    onLoadLogs={loadLogs}
                    loading={loadingLogs}
                  />
                </div>
              ),
            },
            {
              id: "analytics",
              label: "向量分析",
              content: (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                  <AnalyticsPanel token={token} />
                </div>
              ),
            },
          ]}
        />
      </div>

      <Overlay
        show={
          uploading ||
          pasting ||
          testing ||
          savingCfg ||
          loadingLogs ||
          managing
        }
        message={
          uploading
            ? uploadPct < 100
              ? "檔案上傳中…"
              : "已上傳完成，正在解析與寫入向量…"
            : pasting
            ? "寫入中…"
            : testing
            ? "產生回答中…"
            : savingCfg
            ? "儲存設定中…"
            : loadingLogs
            ? "讀取記錄中…"
            : managing
            ? "執行資料管理操作中…"
            : "處理中…"
        }
      />

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

