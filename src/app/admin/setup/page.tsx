"use client";
import { useEffect, useState } from 'react';

type Check = { name: string; ok: boolean; info?: any; error?: string };
type SummaryGroup = { name: string; required: string[]; present: string[]; missing: string[] };

export default function SetupPage(){
  const [provider, setProvider] = useState('');
  const [checks, setChecks] = useState<Check[]>([]);
  const [withDb, setWithDb] = useState(false);
  const [summary, setSummary] = useState<SummaryGroup[]>([]);

  const load = async () => {
    const res = await fetch(`/api/health?withDb=${withDb? '1':'0'}`);
    const j = await res.json(); setProvider(j.provider); setChecks(j.checks || []); setSummary(j.envSummary || []);
  };

  useEffect(()=>{ load(); }, [withDb]);

  return (
    <div>
      <div className="card">
        <div className="title">環境/連線檢查（Health Check）</div>
        <div className="row">
          <div className="col">
            <label>LOG_PROVIDER（目前）</label>
            <input readOnly value={provider} />
          </div>
          <div className="col">
            <label>資料庫連線測試</label>
            <button onClick={()=>setWithDb(s=>!s)}>{withDb? '關閉':'開啟'} DB 測試</button>
          </div>
          <div className="col">
            <label>&nbsp;</label>
            <button className="primary" onClick={load}>重新檢查</button>
          </div>
        </div>

        <table>
          <thead><tr><th>項目</th><th>狀態</th><th>資訊</th></tr></thead>
          <tbody>
            {checks.map((c,i)=> (
              <tr key={i}>
                <td>{c.name}</td>
                <td style={{color: c.ok? '#22c55e':'#ef4444'}}>{c.ok? 'OK':'FAIL'}</td>
                <td style={{whiteSpace:'pre-wrap'}}>{c.ok? JSON.stringify(c.info||{}, null, 2): (c.error||'')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hint">提示：只有在勾選「資料庫連線測試」時才會嘗試實際連線。未勾選時僅檢查環境變數是否存在。</div>
      </div>

      <div className="card">
        <div className="title">環境變數分組（需要/已填/缺少）</div>
        <table>
          <thead><tr><th>分組</th><th>需要</th><th>已填</th><th>缺少</th></tr></thead>
          <tbody>
            {summary.map((g,i)=> (
              <tr key={i}>
                <td>{g.name}</td>
                <td>{g.required.join(', ')}</td>
                <td style={{color:'#22c55e'}}>{g.present.join(', ') || '-'}</td>
                <td style={{color:'#ef4444'}}>{g.missing.join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hint">提示：不同 Provider（LOG_PROVIDER）需要的環境變數不同，例如 pg 需要 DATABASE_URL；Atlas 需要 Data API 參數。</div>
      </div>
    </div>
  );
}

