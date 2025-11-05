import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  checkWidgetTokenStatus, 
  saveWidgetToken, 
  removeWidgetToken,
  getWidgetToken 
} from '@/hooks/useWidgetToken';
import { supabase } from '@/integrations/supabase/client';
import { isNative } from '@/native/platform';
import { RefreshCw, Check, X, AlertCircle, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export function WidgetTokenStatus() {
  const [status, setStatus] = useState<{
    hasToken: boolean;
    tokenLength?: number;
    isValid?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await checkWidgetTokenStatus();
      setStatus(result);
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast({
          title: "غير مُسجل",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        return;
      }

      const success = await saveWidgetToken(session.access_token);
      if (success) {
        await checkStatus();
      }
    } catch (error) {
      console.error('Error resyncing:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRemove = async () => {
    setSyncing(true);
    try {
      const success = await removeWidgetToken();
      if (success) {
        await checkStatus();
      }
    } catch (error) {
      console.error('Error removing token:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleShowToken = async () => {
    try {
      const token = await getWidgetToken();
      if (token) {
        console.log('Widget Token:', token);
        toast({
          title: "Token في Console",
          description: "تحقق من Console في DevTools",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
  };

  if (!isNative()) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            حالة Widget Token
          </CardTitle>
          <CardDescription>
            مراقبة حالة بيانات الـ Widget
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              هذه الميزة متاحة فقط على الأجهزة المحمولة (Android/iOS)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          حالة Widget Token
        </CardTitle>
        <CardDescription>
          مراقبة وإدارة بيانات الـ Widget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        {status && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm font-medium">حالة Token:</span>
              {status.hasToken ? (
                <Badge variant="default" className="gap-1">
                  <Check className="w-3 h-3" />
                  موجود
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <X className="w-3 h-3" />
                  غير موجود
                </Badge>
              )}
            </div>

            {status.hasToken && (
              <>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">حجم Token:</span>
                  <Badge variant="outline">
                    {status.tokenLength} حرف
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">صلاحية Token:</span>
                  {status.isValid ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="w-3 h-3" />
                      صحيح
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <X className="w-3 h-3" />
                      غير صحيح
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={checkStatus}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            فحص الحالة
          </Button>

          <Button
            onClick={handleResync}
            disabled={syncing}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            إعادة المزامنة
          </Button>

          {status?.hasToken && (
            <>
              <Button
                onClick={handleRemove}
                disabled={syncing}
                variant="destructive"
                size="sm"
              >
                حذف Token
              </Button>

              <Button
                onClick={handleShowToken}
                variant="ghost"
                size="sm"
              >
                عرض في Console
              </Button>
            </>
          )}
        </div>

        {/* Info */}
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <p className="text-xs text-muted-foreground">
            💡 Token يُحفظ تلقائياً عند تسجيل الدخول ويُحدّث كل ساعة. 
            الـ Widgets تستخدم هذا Token للوصول للبيانات.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
