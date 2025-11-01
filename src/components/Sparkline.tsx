import React from 'react';

export function Sparkline({ 
  points, 
  width = 240, 
  height = 48 
}: { 
  points: number[]; 
  width?: number; 
  height?: number 
}) {
  if (!points || points.length === 0) return null;
  
  const min = Math.min(...points);
  const max = Math.max(...points);
  
  const norm = (v: number) => {
    if (max === min) return height / 2;
    return height - ((v - min) / (max - min)) * height;
  };
  
  const step = width / Math.max(points.length - 1, 1);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${norm(v)}`).join(' ');

  return (
    <svg width={width} height={height} className="block">
      <path 
        d={d} 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        className="text-primary"
      />
    </svg>
  );
}
