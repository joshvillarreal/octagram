import { expect, test } from 'vitest';
import dictionary from '../../src/data/americanDictionary.json';
const pieces = ['ab', 'cd', 'ef', 'gh', 'ij', 'kl', 'mn', 'op'];
const words = ['abcdef', 'ghijkl', 'mnopab', 'cdghmn', 'efijop', 'abklmn'];
const synthetic: Record<string, number> = Object.fromEntries(words.map(word => [word, 4]));
import { morphologicalDuplicates, scoreGeneratedBoard, splitSeed, validateGeneratedBoard } from '../../src/game/generationRules';
import { createRandomBoardSearch } from '../../src/game/randomBoard';

function rng(seed: number) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
test('rejects ambiguous words, single-letter pieces, and morphological duplicates', () => {
  expect(splitSeed('tester').every(parts => parts.every(p => p.length >= 2))).toBe(true);
  expect(splitSeed('tiny')).toEqual([]);
  expect(morphologicalDuplicates('commute', 'commuter')).toBe(true);
  expect(morphologicalDuplicates('playing', 'play')).toBe(true);
  expect(validateGeneratedBoard(['con', 'cre', 'te', 'cr', 'ete', 'al', 'ic', 'ed'], { concrete: 4 }, 'concrete')).toBeNull();
  expect(validateGeneratedBoard(['a', ...pieces.slice(1)], synthetic, 'abcdef')).toBeNull();
  expect(validateGeneratedBoard(pieces, { abcdef: 4 }, 'abcdef')).toBeNull();
});
test('exhaustively retains accidental words and requires dictionary seed membership', () => {
  const board = validateGeneratedBoard(pieces, synthetic, 'abcdef');
  expect(board).not.toBeNull();
  expect(board!.solutions.map(s => s.word).sort()).toEqual([...words].sort());
  const withoutSeed = { ...synthetic }; delete withoutSeed.abcdef;
  expect(validateGeneratedBoard(pieces, withoutSeed, 'abcdef')).toBeNull();
  expect(scoreGeneratedBoard(board!)).toBeGreaterThan(0);
  const extra = validateGeneratedBoard(pieces, { ...synthetic, cdefij: 3 }, 'abcdef');
  expect(extra!.solutions.map(s => s.word)).toContain('cdefij');
  const moreCommon = { ...board!, solutions: board!.solutions.map(s => ({ ...s, frequency: s.frequency! * 10 })) };
  expect(scoreGeneratedBoard(moreCommon)).toBeGreaterThan(scoreGeneratedBoard(board!));
});
test('random search creates valid, different fresh boards from the American dictionary', () => {
  const boards = [1, 2].map(seed => createRandomBoardSearch(dictionary, rng(seed))(15000));
  for (const board of boards) {
    expect(board).not.toBeNull();
    const seed = board!.solutions[0].word;
    expect(validateGeneratedBoard(board!.pieces, dictionary, seed)).not.toBeNull();
    expect(board!.solutions.every(s => Object.hasOwn(dictionary, s.word))).toBe(true);
    for (const piece of board!.pieces) expect(board!.solutions.filter(s => s.constructions[0].includes(piece)).length).toBeLessThanOrEqual(3);
  }
  expect(boards[0]!.pieces).not.toEqual(boards[1]!.pieces);
}, 30_000);

test('American dictionary excludes British spellings and refresh skips the previous board', () => {
  expect(dictionary).not.toHaveProperty('centre');
  expect(dictionary).not.toHaveProperty('colour');
  expect(dictionary).not.toHaveProperty('theatre');
  const first = createRandomBoardSearch(dictionary, rng(1))(15000)!;
  const next = createRandomBoardSearch(dictionary, rng(1))(15000, first.pieces.join(':'))!;
  expect(next).not.toBeNull();
  expect(next.pieces).not.toEqual(first.pieces);
}, 30_000);

test('fourth use rejects the whole board including accidental words', () => {
  expect(validateGeneratedBoard(pieces, synthetic, 'abcdef')).not.toBeNull();
  expect(validateGeneratedBoard(pieces, { ...synthetic, abghop: 4 }, 'abcdef')).toBeNull();
});
