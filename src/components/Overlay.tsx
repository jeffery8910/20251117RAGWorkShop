"use client";
import React from 'react';

export default function Overlay({ show, message }: { show: boolean; message?: string }){
  if (!show) return null;
  return (
    <div className="overlay">
      <div className="overlayCard">
        <div className="spinner" />
        <div className="overlayMsg">{message || '處理中，請稍候…'}</div>
      </div>
    </div>
  );
}

