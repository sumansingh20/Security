'use client';

import React from 'react';

export default function ExamLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {children}
    </div>
  );
}
