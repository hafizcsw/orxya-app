import { useState, useEffect, useRef } from "react";

type VisibleRange = {
  startHour: number;
  endHour: number;
};

/**
 * Hook to track visible hour range in a scrollable calendar
 * Returns only the hours currently visible in viewport for performance
 */
export function useVisibleHours(
  containerRef: React.RefObject<HTMLElement>,
  pxPerHour: number = 64
): VisibleRange {
  const [visibleRange, setVisibleRange] = useState<VisibleRange>({
    startHour: 0,
    endHour: 24
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      // Calculate visible hour range with buffer
      const bufferHours = 2;
      const startHour = Math.max(0, Math.floor(scrollTop / pxPerHour) - bufferHours);
      const endHour = Math.min(
        24,
        Math.ceil((scrollTop + containerHeight) / pxPerHour) + bufferHours
      );

      setVisibleRange({ startHour, endHour });
    };

    // Initial calculation
    updateVisibleRange();

    // Update on scroll
    container.addEventListener("scroll", updateVisibleRange, { passive: true });
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateVisibleRange);
      resizeObserver.disconnect();
    };
  }, [containerRef, pxPerHour]);

  return visibleRange;
}

/**
 * Check if an event is within visible time range
 */
export function isEventVisible(
  event: { startMin: number; endMin: number },
  visibleRange: VisibleRange
): boolean {
  const eventStartHour = event.startMin / 60;
  const eventEndHour = event.endMin / 60;

  return (
    eventEndHour > visibleRange.startHour &&
    eventStartHour < visibleRange.endHour
  );
}
