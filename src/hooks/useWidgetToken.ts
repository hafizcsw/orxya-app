import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import WidgetToken from '@/plugins/widget-token';
import { isNative } from '@/native/platform';

/**
 * Hook to automatically sync JWT token with native storage for widgets
 */
export function useWidgetTokenSync() {
  useEffect(() => {
    // Only run on native platforms
    if (!isNative()) {
      return;
    }

    // Save token on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.access_token) {
              console.log('[WidgetToken] Saving token for widgets...');
              const result = await WidgetToken.saveToken({ 
                token: session.access_token 
              });
              
              if (result.success) {
                console.log('[WidgetToken] ✅ Token saved successfully');
              }
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('[WidgetToken] Removing token...');
            const result = await WidgetToken.removeToken();
            
            if (result.success) {
              console.log('[WidgetToken] ✅ Token removed successfully');
            }
          }
        } catch (error) {
          console.error('[WidgetToken] ❌ Error syncing token:', error);
        }
      }
    );

    // Initial token save if user is already logged in
    const saveInitialToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          console.log('[WidgetToken] Saving initial token...');
          const result = await WidgetToken.saveToken({ 
            token: session.access_token 
          });
          
          if (result.success) {
            console.log('[WidgetToken] ✅ Initial token saved');
          }
        }
      } catch (error) {
        console.error('[WidgetToken] ❌ Error saving initial token:', error);
      }
    };

    saveInitialToken();

    return () => {
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
    return false;
  }

  try {
    const result = await WidgetToken.saveToken({ token });
    return result.success;
  } catch (error) {
    console.error('[WidgetToken] Error saving token:', error);
    return false;
  }
}

/**
 * Remove JWT token from widget storage
 */
export async function removeWidgetToken(): Promise<boolean> {
  if (!isNative()) {
    return false;
  }

  try {
    const result = await WidgetToken.removeToken();
    return result.success;
  } catch (error) {
    console.error('[WidgetToken] Error removing token:', error);
    return false;
  }
}

/**
 * Get current widget token (for debugging)
 */
export async function getWidgetToken(): Promise<string | null> {
  if (!isNative()) {
    return null;
  }

  try {
    const result = await WidgetToken.getToken();
    return result.token;
  } catch (error) {
    console.error('[WidgetToken] Error getting token:', error);
    return null;
  }
}
