import type { Construction } from '../types/game';

export function deriveConstructions(word: string, pieces: string[]): Construction[] {
  const result: Construction[] = [];
  for (const first of pieces) {
    for (const second of pieces) {
      if (first === second) continue;
      for (const third of pieces) {
        if (third === first || third === second) continue;
        if (first + second + third === word) result.push([first, second, third]);
      }
    }
  }
  return result;
}
