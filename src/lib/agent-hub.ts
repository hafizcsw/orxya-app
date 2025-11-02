import { supabase } from '@/integrations/supabase/client';

export type ActionResult = { 
  action: any; 
  result?: any; 
  error?: string;
};

export type AgentResponse = {
  ok: boolean;
  assistant_message?: string;
  applied_actions?: ActionResult[];
  tips?: string[];
  error?: string;
};

export async function askAgentHub(message: string): Promise<AgentResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('agent-hub', {
      body: { message }
    });

    if (error) {
      console.error('Agent hub error:', error);
      return {
        ok: false,
        error: error.message || 'فشل الاتصال بالمساعد'
      };
    }

    return data as AgentResponse;
  } catch (e: any) {
    console.error('Agent hub exception:', e);
    return {
      ok: false,
      error: e.message || 'خطأ في الاتصال'
    };
  }
}

export async function quickConnect() {
  return askAgentHub('أريد ربط تقويمي على Google.');
}

export async function quickSync() {
  return askAgentHub('قم بمزامنة تقويم Google الآن.');
}

export async function quickConflicts() {
  return askAgentHub('هل لدي تعارضات مع الصلاة اليوم؟');
}

export async function quickLocationUpdate() {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      });
    });

    const { latitude, longitude } = pos.coords;
    
    // Update location first
    const { error } = await supabase.functions.invoke('location-update', {
      body: { latitude, longitude }
    });

    if (error) throw error;

    // Then ask agent to sync prayers and check conflicts
    return askAgentHub('تم تحديث موقعي. حدّث مواقيت الصلاة وفحص التعارضات.');
  } catch (e: any) {
    return {
      ok: false,
      error: 'فشل تحديث الموقع: ' + (e.message || 'غير متاح')
    } as AgentResponse;
  }
}
