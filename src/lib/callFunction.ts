import { supabase } from '@/integrations/supabase/client';

/**
 * Unified helper to call Edge Functions with proper auth headers
 */
export async function callFunction<T = any>(name: string, body?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session - please login first');
  }
  
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { 
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
  });
  
  if (error) {
    console.error(`[callFunction] Error calling ${name}:`, error);
    throw error;
  }
  
  return data as T;
}
