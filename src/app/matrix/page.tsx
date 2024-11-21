"use client";

import dynamic from 'next/dynamic';

const MatrixComponent = dynamic(
  () => import('@/components/ui/matrixComponent'),
  { ssr: false }
);

export default function MatrixPage() {
  return (
    <div className="w-full h-screen bg-black" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      <MatrixComponent />
    </div>
  );
}
