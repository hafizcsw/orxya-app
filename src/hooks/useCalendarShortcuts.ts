import { useEffect } from 'react';

type ShortcutHandlers = {
  onQuickAdd?: () => void;
  onToday?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onDayView?: () => void;
  onWeekView?: () => void;
  onMonthView?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
};

export function useCalendarShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Escape and Ctrl/Cmd+S even in inputs
        if (e.key !== 'Escape' && !(e.key === 's' && (e.ctrlKey || e.metaKey))) {
          return;
        }
      }

      // Quick Add
      if ((e.key === 'c' || e.key === 'q') && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
        handlers.onQuickAdd?.();
      }

      // Today
      if (e.key === 't' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onToday?.();
      }

      // Navigation
      if (e.key === 'j' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onPrevious?.();
      }
      if (e.key === 'k' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onNext?.();
      }

      // View switching
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onDayView?.();
      }
      if (e.key === 'w' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onWeekView?.();
      }
      if (e.key === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onMonthView?.();
      }

      // Delete
      if (e.key === 'Delete' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handlers.onDelete?.();
      }

      // Save
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlers.onSave?.();
      }

      // Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onEscape?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
