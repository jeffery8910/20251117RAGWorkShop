"use client";
import React from 'react';

export default function Info({ text }: { text: string }){
  return <span className="info" title={text}>i</span>;
}

