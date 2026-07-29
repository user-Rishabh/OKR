import React from 'react';

export function SkeletonCard() {
  return (
    <div className="card p-6 space-y-4">
      <div className="shimmer h-4 rounded-lg w-2/3" />
      <div className="shimmer h-8 rounded-lg w-1/3" />
      <div className="shimmer h-3 rounded-lg w-full" />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}
