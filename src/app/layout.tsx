import '../styles/globals.css';
import React from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="container">
          <h1 style={{margin:'8px 0'}}>RAG × LINE 管理介面（雲端）</h1>
          {children}
        </div>
      </body>
    </html>
  );
}
