import { X } from 'lucide-react';

interface KeyboardHelpProps {
  onClose: () => void;
}

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  const shortcuts = [
    { key: '?', desc: 'إظهار/إخفاء هذه المساعدة' },
    { key: 'n', desc: 'إضافة مهمة جديدة' },
    { key: '1', desc: 'الانتقال إلى عمود To-Do' },
    { key: '2', desc: 'الانتقال إلى عمود Doing' },
    { key: '3', desc: 'الانتقال إلى عمود Done' },
    { key: '/', desc: 'التركيز على البحث' },
    { key: 'Esc', desc: 'إلغاء/إغلاق' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">اختصارات لوحة المفاتيح</h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="space-y-2">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-muted-foreground">{desc}</span>
              <kbd className="px-2 py-1 text-sm font-mono bg-muted rounded border border-border">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
