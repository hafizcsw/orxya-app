import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  CheckCircle, 
  XCircle, 
  Globe, 
  Smartphone,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react';
import { 
  getUpdateHistory, 
  clearUpdateHistory, 
  getUpdateStats,
  type UpdateRecord 
} from '@/lib/update-history';
import { formatDistanceToNow } from 'date-fns';
import { ar, es, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function UpdateHistory() {
  const { i18n } = useTranslation();
  const [history, setHistory] = useState<UpdateRecord[]>([]);
  const [stats, setStats] = useState(getUpdateStats());

  const loadHistory = () => {
    setHistory(getUpdateHistory());
    setStats(getUpdateStats());
  };

  useEffect(() => {
    loadHistory();
    
    // Listen for new updates
    const handleUpdate = () => loadHistory();
    window.addEventListener('update-history-changed', handleUpdate);
    return () => window.removeEventListener('update-history-changed', handleUpdate);
  }, []);

  const handleClear = () => {
    clearUpdateHistory();
    loadHistory();
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ar': return ar;
      case 'es': return es;
      default: return enUS;
    }
  };

  const getTypeIcon = (type: UpdateRecord['type']) => {
    return type === 'pwa' ? (
      <Globe className="w-4 h-4 text-primary" />
    ) : (
      <Smartphone className="w-4 h-4 text-primary" />
    );
  };

  const getStatusIcon = (status: UpdateRecord['status']) => {
    return status === 'success' ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-destructive" />
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">سجل التحديثات</h2>
        <p className="text-muted-foreground">
          عرض جميع التحديثات السابقة وحالتها
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">إجمالي التحديثات</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-500">{stats.successful}</div>
          <div className="text-sm text-muted-foreground">ناجح</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
          <div className="text-sm text-muted-foreground">فاشل</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-primary">{stats.native}</div>
          <div className="text-sm text-muted-foreground">تحديثات نيتف</div>
        </Card>
      </div>

      {/* History List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">السجل الكامل</h3>
          </div>
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Trash2 className="w-4 h-4 ml-2" />
                  مسح السجل
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                  <AlertDialogDescription>
                    سيتم حذف جميع سجلات التحديثات بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClear}>
                    مسح الكل
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد تحديثات مسجلة بعد</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex gap-2 mt-1">
                    {getTypeIcon(record.type)}
                    {getStatusIcon(record.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-semibold">
                        {record.version}
                      </span>
                      <Badge variant={record.type === 'pwa' ? 'secondary' : 'default'}>
                        {record.type === 'pwa' ? 'PWA' : 'Native'}
                      </Badge>
                      <Badge variant={record.status === 'success' ? 'default' : 'destructive'}>
                        {record.status === 'success' ? 'نجح' : 'فشل'}
                      </Badge>
                    </div>
                    
                    {record.previousVersion && (
                      <div className="text-sm text-muted-foreground mb-2">
                        من النسخة: {record.previousVersion}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(record.timestamp).toLocaleDateString(i18n.language, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(record.timestamp, {
                          addSuffix: true,
                          locale: getDateLocale()
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
