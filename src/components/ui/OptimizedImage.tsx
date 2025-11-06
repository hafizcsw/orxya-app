import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  webpSrc?: string;
}

export function OptimizedImage({
  src,
  alt,
  fallbackSrc,
  className,
  webpSrc,
  loading = 'lazy',
  ...props
}: OptimizedImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <picture>
      {webpSrc && <source srcSet={webpSrc} type="image/webp" />}
      <img
        src={error && fallbackSrc ? fallbackSrc : src}
        alt={alt}
        loading={loading}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        className={cn(
          'transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </picture>
  );
}
