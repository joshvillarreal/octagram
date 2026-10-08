export function savedIncorrectFeedback(): boolean {
  try { return localStorage.getItem('octagram-incorrect-feedback') !== 'false'; }
  catch { return true; }
}
