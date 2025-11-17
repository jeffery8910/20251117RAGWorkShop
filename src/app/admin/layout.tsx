"use client";
import React from 'react';
import AdminGate from './AdminGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate>
      <div style={{marginBottom:16, display:'flex', gap:16, alignItems:'center', padding: '0 4px'}}>
        <a 
          href="/admin" 
          style={{color: '#10b981', textDecoration: 'none', fontWeight: '500'}}
        >
          管理介面
        </a>
        <span style={{color: '#6b7280'}}>•</span>
        <a 
          href="/admin/conversations" 
          style={{color: '#10b981', textDecoration: 'none', fontWeight: '500'}}
        >
          對話紀錄
        </a>
        <div style={{marginLeft:'auto', fontSize:13, color:'#94a3b8', display: 'flex', alignItems: 'center', gap: '8px'}}>
          已登入
          <button 
            style={{
              marginLeft:8, 
              padding: '4px 12px', 
              background: '#374151', 
              color: '#e5e7eb', 
              border: '1px solid #4b5563', 
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }} 
            onClick={()=>{ 
              localStorage.removeItem('adminToken'); 
              location.reload(); 
            }}
          >
            登出
          </button>
        </div>
      </div>
      {children}
    </AdminGate>
  );
}
