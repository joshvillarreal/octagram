import type { OctagramBoard } from '../types/game';
import { scoreGeneratedBoard, splitSeed, validateGeneratedBoard } from './generationRules';
import type { WordDictionary } from './generationRules';

function pairKey(a: string, b: string): string { return a < b ? `${a}:${b}` : `${b}:${a}`; }
/** Index once per worker; search and scoring remain separate from game rules. */
export function createRandomBoardSearch(dictionary: WordDictionary, random: () => number = Math.random) {
  const extensions = new Map<string, Set<string>>();
  const seeds = Object.keys(dictionary).filter(word => splitSeed(word).length > 0);
  if (!seeds.length) throw new Error('No constructible dictionary words.');
  const pool = new Set<string>();
  for (const word of seeds) for (const parts of splitSeed(word)) {
    for (let i = 0; i < 3; i++) {
      const key = pairKey(parts[(i + 1) % 3], parts[(i + 2) % 3]);
      if (!extensions.has(key)) extensions.set(key, new Set());
      extensions.get(key)!.add(parts[i]);
      pool.add(parts[i]);
    }
  }
  const globalPieces = [...pool];
  if (globalPieces.length < 8) throw new Error('Dictionary cannot supply eight unique pieces.');
  const choose = <T,>(items: T[]): T => items[Math.floor(random() * items.length)];
  return function search(attempts = 15000, excludedPieces = ''): OctagramBoard | null {
    let best: OctagramBoard | null = null;
    const seen = new Set<string>();
    // Try many randomly selected 6–9 letter American seed words.
    for (let attempt = 0; attempt < attempts; attempt++) {
      const seed = choose(seeds);
      const current = new Set(choose(splitSeed(seed)));
      const global = random() < .1;
      while (current.size < 8) {
        if (global) { current.add(choose(globalPieces)); continue; }
        const support = new Map<string, number>();
        const parts = [...current];
        for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
          for (const piece of extensions.get(pairKey(parts[i], parts[j])) ?? []) {
            if (!current.has(piece)) support.set(piece, (support.get(piece) ?? 0) + 1);
          }
        }
        if (!support.size) break;
        let weight = random() * [...support.values()].reduce((sum, n) => sum + n * n, 0);
        for (const [piece, n] of support) { weight -= n * n; if (weight <= 0) { current.add(piece); break; } }
      }
      if (current.size !== 8) continue;
      const pieces = [...current].sort();
      const key = pieces.join(':');
      if (key === excludedPieces) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const board = validateGeneratedBoard(pieces, dictionary, seed);
      if (!board) continue;
      board.score = scoreGeneratedBoard(board);
      if (!best || board.score > best.score!) best = board;
    }
    return best;
  };
}
