"use client";

import React from 'react';
import MatrixComponent from '@/components/ui/matrixComponent';

export default function MatrixPage() {
  return (
    <div className="w-full h-screen bg-black" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      <MatrixComponent />
    </div>
  );
}
