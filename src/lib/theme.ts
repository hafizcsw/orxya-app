export type ThemePref = 'light' | 'dark' | 'system';
export type DensityPref = 'comfortable' | 'compact';

let systemThemeListener: MediaQueryList | null = null;

export function applyTheme(theme: ThemePref, accent?: string) {
  const root = document.documentElement;
  
  // إزالة المستمع القديم إن وُجد
  if (systemThemeListener) {
    systemThemeListener.removeEventListener('change', handleSystemThemeChange);
    systemThemeListener = null;
  }
  
  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeListener = mq;
    
    // تطبيق الثيم الحالي
    root.dataset.theme = mq.matches ? 'dark' : 'light';
    
    // الاستماع للتغييرات في إعدادات النظام
    mq.addEventListener('change', handleSystemThemeChange);
    
    console.log('📱 تم تفعيل متابعة إعدادات النظام -', mq.matches ? 'وضع مظلم' : 'وضع نهاري');
  } else {
    root.dataset.theme = theme;
    console.log('🎨 تم تطبيق الثيم:', theme);
  }
  
  if (accent) {
    root.style.setProperty('--accent-hsl', accent);
    console.log('🎨 تم تطبيق اللون:', accent);
  }
}

function handleSystemThemeChange(e: MediaQueryListEvent) {
  const root = document.documentElement;
  root.dataset.theme = e.matches ? 'dark' : 'light';
  console.log('📱 تغيّرت إعدادات النظام إلى:', e.matches ? 'وضع مظلم' : 'وضع نهاري');
  
  // إشعار المستخدم بالتغيير
  const event = new CustomEvent('system-theme-changed', { 
    detail: { isDark: e.matches, theme: e.matches ? 'dark' : 'light' } 
  });
  window.dispatchEvent(event);
}

export function applyDensity(density: DensityPref) {
  document.documentElement.dataset.density = density;
}

export function getSystemTheme(): 'light' | 'dark' {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  return mq.matches ? 'dark' : 'light';
}

export function isSystemDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
