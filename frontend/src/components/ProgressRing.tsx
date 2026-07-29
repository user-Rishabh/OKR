import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showText?: boolean;
}

export default function ProgressRing({ progress, size = 60, strokeWidth = 6, showText = true }: ProgressRingProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) { setAnimatedProgress(progress); return; }
    const timer = setTimeout(() => setAnimatedProgress(progress), 80);
    return () => clearTimeout(timer);
  }, [progress]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clamped = Math.max(0, Math.min(100, animatedProgress));
  const offset = circumference - (clamped / 100) * circumference;

  let strokeColor = '#10B981'; // green ≥70%
  if (clamped < 30) strokeColor = '#EF4444';
  else if (clamped < 70) strokeColor = '#F2994A';

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle fill="transparent" strokeWidth={strokeWidth} stroke="#E8E2D6" r={radius} cx={size / 2} cy={size / 2} />
        <circle
          fill="transparent"
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      {showText && (
        <span className="absolute text-center font-mono font-bold" style={{ fontSize: size * 0.22, color: '#1A1A1A' }}>
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
