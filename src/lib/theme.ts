export type ThemePref = 'light' | 'dark' | 'system';
export type DensityPref = 'comfortable' | 'compact';

export function applyTheme(theme: ThemePref, accent?: string) {
  const root = document.documentElement;
  if (theme === 'system') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    root.dataset.theme = mq.matches ? 'dark' : 'light';
  } else {
    root.dataset.theme = theme;
  }
  if (accent) root.style.setProperty('--accent-hex', accent);
}

export function applyDensity(density: DensityPref) {
  document.documentElement.dataset.density = density;
}
