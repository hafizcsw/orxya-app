import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface BackgroundAIProps {
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}

export function BackgroundAI({ className, intensity = 'medium' }: BackgroundAIProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const intensityConfig = {
    low: { blur: 60, opacity: 0.3, scale: 1.2 },
    medium: { blur: 80, opacity: 0.4, scale: 1.4 },
    high: { blur: 100, opacity: 0.5, scale: 1.6 },
  };

  const config = intensityConfig[intensity];

  return (
    <div
      ref={canvasRef}
      className={cn(
        'pointer-events-none fixed inset-0 -z-10 isolate overflow-hidden',
        className
      )}
    >
      {/* Animated gradient blobs */}
      <div
        className="absolute top-0 -left-1/4 w-1/2 h-1/2 rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)',
          filter: `blur(${config.blur}px)`,
          opacity: config.opacity,
          transform: `scale(${config.scale})`,
          animationDuration: '20s',
          willChange: 'transform',
        }}
      />

      <div
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--accent) / 0.4), transparent 70%)',
          filter: `blur(${config.blur}px)`,
          opacity: config.opacity,
          transform: `scale(${config.scale})`,
          animationDuration: '25s',
          animationDelay: '5s',
          willChange: 'transform',
        }}
      />

      <div
        className="absolute top-1/3 left-1/2 w-1/3 h-1/3 rounded-full animate-float"
        style={{
          background: 'radial-gradient(circle, hsl(var(--success) / 0.3), transparent 70%)',
          filter: `blur(${config.blur}px)`,
          opacity: config.opacity * 0.8,
          transform: `scale(${config.scale * 0.8})`,
          animationDuration: '30s',
          animationDelay: '10s',
          willChange: 'transform',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          opacity: 0.3,
        }}
      />
    </div>
  );
}
