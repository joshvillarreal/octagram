export type Theme = 'light' | 'dark';
export function savedTheme(): Theme {
  try { if (localStorage.getItem('octagram-theme') === 'dark') return 'dark'; } catch { /* Storage is optional. */ }
  return 'light';
}
