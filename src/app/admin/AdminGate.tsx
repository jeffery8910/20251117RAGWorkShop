"use client";
import React, { useCallback, useEffect, useState } from 'react';

type Props = { children: React.ReactNode };

export default function AdminGate({ children }: Props) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle'|'checking'|'valid'|'invalid'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('adminToken') || '';
    if (t) { setToken(t); validate(t); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = useCallback(async (t: string) => {
    if (!t) { setStatus('invalid'); setMessage('請輸入 Admin Token'); return; }
    setStatus('checking'); setMessage('驗證中…');
    try {
      const res = await fetch('/api/admin/ping', {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        localStorage.setItem('adminToken', t);
        setStatus('valid'); setMessage('驗證成功，可進入管理介面');
      } else {
        setStatus('invalid'); setMessage('驗證失敗：Token 不正確或未授權');
      }
    } catch (e: any) {
      setStatus('invalid'); setMessage(`驗證失敗：${e?.message || e}`);
    }
  }, []);

  if (status !== 'valid') {
    return (
      <div className="card">
        <div className="title">管理員登入</div>
        <div className="row">
          <div className="col">
            <label>Admin Token（需與環境變數 ADMIN_TOKEN 相同）</label>
            <input value={token} onChange={e=>setToken(e.target.value)} placeholder="輸入 Token" />
          </div>
          <div className="col">
            <label>&nbsp;</label>
            <button className="primary" onClick={()=>validate(token)} disabled={status==='checking'}>
              {status==='checking' ? '驗證中…' : '驗證並進入'}
            </button>
          </div>
        </div>
        <div className="hint">{message || '提示：此 Token 僅儲存在瀏覽器 localStorage。'}</div>
      </div>
    );
  }

  return <>{children}</>;
}
