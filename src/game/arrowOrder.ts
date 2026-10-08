interface LayeredArrow { id: string; headBlockers: string[]; completed?: boolean }

/** Maximize fully unobscured heads, with completed routes behind and focus on top.
 * Build the stack front-to-back: a head is visible iff no blocker is already above it.
 */
export function maximizeVisibleHeads<T extends LayeredArrow>(arrows: T[], focusedId?: string): T[] {
  const rank = (arrow: T) => arrow.id === focusedId ? 2 : arrow.completed ? 0 : 1;
  if (arrows.length > 16) {
    // Generated boards have at most eight words; bound work for legacy fixtures.
    return [...arrows].sort((a, b) => rank(a) - rank(b) || a.headBlockers.length - b.headBlockers.length);
  }
  const blockers = arrows.map(arrow => arrows.reduce((mask, other, i) => mask | (arrow.headBlockers.includes(other.id) ? 1 << i : 0), 0));
  const required = arrows.map(arrow => arrows.reduce((mask, other, i) => mask | (rank(other) > rank(arrow) ? 1 << i : 0), 0));
  const size = 1 << arrows.length;
  const scores = new Int16Array(size).fill(-1), last = new Int16Array(size).fill(-1);
  scores[0] = 0;
  for (let mask = 0; mask < size; mask++) {
    if (scores[mask] < 0) continue;
    for (let i = 0; i < arrows.length; i++) {
      const bit = 1 << i;
      if (mask & bit || (required[i] & mask) !== required[i]) continue;
      const next = mask | bit;
      const score = scores[mask] + ((blockers[i] & mask) === 0 ? 1 : 0);
      if (score > scores[next]) { scores[next] = score; last[next] = i; }
    }
  }
  const result: T[] = [];
  for (let mask = size - 1; mask; ) {
    const i = last[mask]; result.push(arrows[i]); mask ^= 1 << i;
  }
  return result;
}
