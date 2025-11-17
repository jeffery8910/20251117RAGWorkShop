"use client";
import { useEffect, useMemo, useState } from 'react';
import Overlay from '@/components/Overlay';
import AdminGate from '../../AdminGate';

export default function ConversationDetail({ params }: { params: { id: string } }){
  const [token, setToken] = useState('');
  const [row, setRow] = useState<any>(null);
  const id = params.id;
  const auth = useMemo(()=> ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/conversations/${id}`, { headers: { ...auth.headers } });
    if (!res.ok) { setLoading(false); return alert('讀取失敗/未授權或不存在'); }
    const j = await res.json(); setRow(j);
    setLoading(false);
  };

  useEffect(()=>{ const t = localStorage.getItem('adminToken')||''; setToken(t); },[]);
  useEffect(()=>{ if (token) load(); }, [token]);

  return (
    <AdminGate>
    <div>
      <div className="card">
        <div className="title">對話明細</div>
        <div className="row">
          <div className="col"><label>ID</label><input readOnly value={id} /></div>
        </div>
        {!row ? <div className="hint">載入中或無資料</div> : (
          <div>
            <div className="row">
              <div className="col"><label>時間</label><input readOnly value={row.ts} /></div>
              <div className="col"><label>方向</label><input readOnly value={row.direction} /></div>
              <div className="col"><label>類型</label><input readOnly value={row.type} /></div>
              <div className="col"><label>使用者</label><input readOnly value={row.userId||''} /></div>
            </div>
            <label>內容</label>
            <textarea rows={6} readOnly value={row.text||''} />
            {Array.isArray(row.hits) && row.hits.length>0 && (
              <div style={{marginTop:12}}>
                <div className="title">檢索片段與分數</div>
                <table>
                  <thead><tr><th>來源</th><th>頁次</th><th>分數</th></tr></thead>
                  <tbody>
                    {row.hits.map((h:any, i:number)=> (
                      <tr key={i}><td>{h.source||'-'}</td><td>{h.page||'-'}</td><td>{typeof h.score==='number'? h.score.toFixed(4): h.score||'-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    <Overlay show={loading} message="載入對話明細…" />
    </AdminGate>
  );
}
