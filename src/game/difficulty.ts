export const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', maxUses: 3 },
  { id: 'medium', label: 'Medium', maxUses: 4 },
  { id: 'hard', label: 'Hard', maxUses: 6 },
] as const;
export type Difficulty = typeof DIFFICULTIES[number]['id'];
export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.some(option => option.id === value);
}
export function maxPieceUses(difficulty: Difficulty): number {
  return DIFFICULTIES.find(option => option.id === difficulty)!.maxUses;
}
export function savedDifficulty(): Difficulty {
  try {
    const value = localStorage.getItem('octagram-difficulty');
    if (value === 'expert') return 'hard';
    if (isDifficulty(value)) return value;
  } catch { /* Storage is optional. */ }
  return 'easy';
}
