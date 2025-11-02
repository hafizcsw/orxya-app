import { useEffect } from 'react';

export type KeyboardShortcut = {
  key: string;
  ctrlOrCmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
};

export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach(({ key, ctrlOrCmd, shift, alt, handler }) => {
        const isCtrlOrCmd = ctrlOrCmd ? (e.ctrlKey || e.metaKey) : true;
        const isShift = shift !== undefined ? e.shiftKey === shift : true;
        const isAlt = alt !== undefined ? e.altKey === alt : true;

        if (
          e.key.toLowerCase() === key.toLowerCase() &&
          isCtrlOrCmd &&
          isShift &&
          isAlt
        ) {
          e.preventDefault();
          handler(e);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

export function getShortcutLabel(shortcut: Pick<KeyboardShortcut, 'key' | 'ctrlOrCmd' | 'shift' | 'alt'>) {
  const parts: string[] = [];
  if (shortcut.ctrlOrCmd) parts.push('⌘/Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  parts.push(shortcut.key.toUpperCase());
  return parts.join(' + ');
}
