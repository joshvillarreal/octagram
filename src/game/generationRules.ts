import type { Construction, OctagramBoard } from '../types/game';

export type WordDictionary = Record<string, number>; // Zipf scores
export function splitSeed(word: string): Construction[] {
  const result: Construction[] = [];
  for (const a of [2, 3]) for (const b of [2, 3]) {
    const c = word.length - a - b;
    const parts: Construction = [word.slice(0, a), word.slice(a, a + b), word.slice(a + b)];
    if (c >= 2 && c <= 3 && new Set(parts).size === 3) result.push(parts);
  }
  return result;
}
export function morphologicalDuplicates(left: string, right: string): boolean {
  const [short, long] = left.length <= right.length ? [left, right] : [right, left];
  const forms = new Set(['s', 'es', 'ed', 'er', 'ers', 'ing', 'ly'].map(s => short + s));
  if (short.endsWith('e')) for (const form of [short + 'd', short + 'r', short + 'rs', short.slice(0, -1) + 'ing']) forms.add(form);
  if (short.endsWith('y')) for (const suffix of ['ies', 'ied']) forms.add(short.slice(0, -1) + suffix);
  if (/[^aeiou][aeiou][^aeiou]$/.test(short)) for (const suffix of ['ed', 'ing']) forms.add(short + short.at(-1) + suffix);
  return forms.has(long);
}
/** Exhaustive membership and rule checks; never drop accidental words. */
export function validateGeneratedBoard(pieces: string[], dictionary: WordDictionary, seed: string, maxUses = 3): OctagramBoard | null {
  if (!Number.isInteger(maxUses) || maxUses < 3 || maxUses > 6) throw new Error('Maximum tile usage must be between 3 and 6.');
  if (pieces.length !== 8 || new Set(pieces).size !== 8 || pieces.some(p => !/^[a-z]{2,3}$/.test(p))) return null;
  const found = new Map<string, Construction>();
  for (const a of pieces) for (const b of pieces) for (const c of pieces) {
    if (a === b || a === c || b === c) continue;
    const word = a + b + c;
    if (!Object.hasOwn(dictionary, word)) continue;
    if (found.has(word)) return null; // Ambiguity rejects the entire board.
    found.set(word, [a, b, c]);
  }
  if (!found.has(seed)) return null;
  const words = [...found.keys()].sort();
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) if (morphologicalDuplicates(words[i], words[j])) return null;
  const usage = pieces.map(p => [...found.values()].filter(parts => parts.includes(p)).length);
  if (usage.some(n => n > maxUses)) return null;
  if (usage.filter(n => n >= 2).length < 7) return null;
  return { pieces: [...pieces], solutions: words.map(word => ({ word, constructions: [found.get(word)!], frequency: 10 ** dictionary[word] })) };
}
export function scoreGeneratedBoard(board: OctagramBoard): number {
  const usage = board.pieces.map(p => board.solutions.filter(s => s.constructions[0].includes(p)).length);
  const commonality = board.solutions.reduce((sum, s) => sum + Math.log10(1 + (s.frequency ?? 0)), 0) / Math.max(board.solutions.length, 1);
  return 2 * usage.reduce((sum, n) => sum + 1 / (1 + Math.max(3 - n, n - 4, 0)), 0) + .25 * Math.min(board.solutions.length, 10) + .25 * commonality;
}
