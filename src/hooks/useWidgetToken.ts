import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import WidgetToken from '@/plugins/widget-token';
import { isNative } from '@/native/platform';
import { toast } from '@/hooks/use-toast';

/**
 * Hook to automatically sync JWT token with native storage for widgets
 */
export function useWidgetTokenSync() {
  useEffect(() => {
    // Only run on native platforms
    if (!isNative()) {
      console.log('[WidgetToken] Running on web platform, skipping native sync');
      return;
    }

    console.log('[WidgetToken] 🚀 Initializing widget token sync...');

    // Save token on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.access_token) {
              console.log('[WidgetToken] 📝 Saving token for widgets...', {
                event,
                tokenLength: session.access_token.length,
                expiresAt: session.expires_at
              });
              
              const result = await WidgetToken.saveToken({ 
                token: session.access_token 
              });
              
              if (result.success) {
                console.log('[WidgetToken] ✅ Token saved successfully');
                
                // Only show toast on sign in, not on refresh
                if (event === 'SIGNED_IN') {
                  toast({
                    title: "Widget جاهز",
                    description: "تم تفعيل الـ Widget للشاشة الرئيسية",
                    duration: 3000,
                  });
                }
              } else {
                console.error('[WidgetToken] ❌ Failed to save token');
                toast({
                  title: "خطأ في تفعيل Widget",
                  description: "فشل حفظ البيانات للـ Widget",
                  variant: "destructive",
                  duration: 5000,
                });
              }
            } else {
              console.warn('[WidgetToken] ⚠️ No access token in session');
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('[WidgetToken] 🗑️ Removing token...');
            const result = await WidgetToken.removeToken();
            
            if (result.success) {
              console.log('[WidgetToken] ✅ Token removed successfully');
            } else {
              console.error('[WidgetToken] ❌ Failed to remove token');
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('[WidgetToken] ❌ Error syncing token:', {
            error: errorMessage,
            event,
            stack: error instanceof Error ? error.stack : undefined
          });
          
          toast({
            title: "خطأ في Widget",
            description: `فشل مزامنة البيانات: ${errorMessage}`,
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    );

    // Initial token save if user is already logged in
    const saveInitialToken = async () => {
      try {
        console.log('[WidgetToken] 🔍 Checking for existing session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[WidgetToken] ❌ Error getting session:', error);
          return;
        }
        
        if (session?.access_token) {
          console.log('[WidgetToken] 📝 Saving initial token...', {
            tokenLength: session.access_token.length,
            expiresAt: session.expires_at
          });
          
          const result = await WidgetToken.saveToken({ 
            token: session.access_token 
          });
          
          if (result.success) {
            console.log('[WidgetToken] ✅ Initial token saved');
          } else {
            console.error('[WidgetToken] ❌ Failed to save initial token');
            toast({
              title: "تحذير Widget",
              description: "قد لا يعمل الـ Widget بشكل صحيح. جرب تسجيل الخروج والدخول مرة أخرى.",
              variant: "destructive",
              duration: 7000,
            });
          }
        } else {
          console.log('[WidgetToken] ℹ️ No active session found');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[WidgetToken] ❌ Error saving initial token:', {
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });
        
        toast({
          title: "خطأ في تهيئة Widget",
          description: `فشل حفظ البيانات الأولية: ${errorMessage}`,
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    saveInitialToken();

    return () => {
      console.log('[WidgetToken] 🔌 Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, []);
}

/**
 * Manually save JWT token for widgets
 */
export async function saveWidgetToken(token: string): Promise<boolean> {
  if (!isNative()) {
    console.log('[WidgetToken] Not on native platform, skipping...');
    toast({
      title: "غير متاح",
      description: "هذه الميزة متاحة فقط على الأجهزة المحمولة",
      duration: 3000,
    });
    return false;
  }

  try {
    console.log('[WidgetToken] 📝 Manually saving token...', {
      tokenLength: token.length
    });
    
    const result = await WidgetToken.saveToken({ token });
    
    if (result.success) {
      console.log('[WidgetToken] ✅ Token saved successfully');
      toast({
        title: "تم الحفظ",
        description: "تم حفظ بيانات الـ Widget بنجاح",
        duration: 3000,
      });
      return true;
    } else {
      console.error('[WidgetToken] ❌ Failed to save token');
      toast({
        title: "فشل الحفظ",
        description: "لم يتم حفظ البيانات للـ Widget",
        variant: "destructive",
        duration: 4000,
      });
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WidgetToken] ❌ Error saving token:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    toast({
      title: "خطأ",
      description: `فشل حفظ البيانات: ${errorMessage}`,
      variant: "destructive",
      duration: 5000,
    });
    return false;
  }
}

/**
 * Remove JWT token from widget storage
 */
export async function removeWidgetToken(): Promise<boolean> {
  if (!isNative()) {
    console.log('[WidgetToken] Not on native platform, skipping...');
    return false;
  }

  try {
    console.log('[WidgetToken] 🗑️ Manually removing token...');
    const result = await WidgetToken.removeToken();
    
    if (result.success) {
      console.log('[WidgetToken] ✅ Token removed successfully');
      toast({
        title: "تم الحذف",
        description: "تم حذف بيانات الـ Widget",
        duration: 3000,
      });
      return true;
    } else {
      console.error('[WidgetToken] ❌ Failed to remove token');
      toast({
        title: "فشل الحذف",
        description: "لم يتم حذف البيانات",
        variant: "destructive",
        duration: 4000,
      });
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WidgetToken] ❌ Error removing token:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    toast({
      title: "خطأ",
      description: `فشل حذف البيانات: ${errorMessage}`,
      variant: "destructive",
      duration: 5000,
    });
    return false;
  }
}

/**
 * Get current widget token (for debugging)
 */
export async function getWidgetToken(): Promise<string | null> {
  if (!isNative()) {
    console.log('[WidgetToken] Not on native platform, skipping...');
    return null;
  }

  try {
    console.log('[WidgetToken] 🔍 Getting current token...');
    const result = await WidgetToken.getToken();
    
    if (result.token) {
      console.log('[WidgetToken] ✅ Token found', {
        tokenLength: result.token.length,
        preview: result.token.substring(0, 20) + '...'
      });
    } else {
      console.log('[WidgetToken] ℹ️ No token found');
    }
    
    return result.token;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[WidgetToken] ❌ Error getting token:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    toast({
      title: "خطأ",
      description: `فشل الحصول على البيانات: ${errorMessage}`,
      variant: "destructive",
      duration: 4000,
    });
    return null;
  }
}

/**
 * Check widget token status (for debugging)
 */
export async function checkWidgetTokenStatus(): Promise<{
  hasToken: boolean;
  tokenLength?: number;
  isValid?: boolean;
}> {
  if (!isNative()) {
    return { hasToken: false };
  }

  try {
    const token = await getWidgetToken();
    
    if (!token) {
      return { hasToken: false };
    }

    // Check if token looks valid (JWT format)
    const isValid = token.split('.').length === 3;
    
    const status = {
      hasToken: true,
      tokenLength: token.length,
      isValid
    };
    
    console.log('[WidgetToken] 📊 Token status:', status);
    
    return status;
  } catch (error) {
    console.error('[WidgetToken] ❌ Error checking token status:', error);
    return { hasToken: false };
  }
}
