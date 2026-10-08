import type { Construction, OctagramBoard, Solution } from '../types/game';
import { deriveConstructions } from './constructions';
import { validateBoard, validateConstruction } from './validation';

type Data = Record<string, unknown>;
function object(value: unknown, label: string): Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Data;
}
function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  return value.trim().toLowerCase();
}
function texts(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map(item => text(item, label));
}
function number(value: unknown, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
  return value;
}

/** Supports normalized, legacy usage/frequency, and complete Python result JSON. */
export function parseBoard(input: unknown): OctagramBoard {
  if (Array.isArray(input)) {
    if (!input.length) throw new Error('The board results array is empty.');
    input = input[0];
  }
  const data = object(input, 'Board');
  if (data.valid === false) throw new Error('The generator marked this board as invalid.');
  let pieces: string[];
  if (data.pieces !== undefined) pieces = texts(data.pieces, 'Pieces');
  else if (data.board !== undefined) pieces = texts(object(data.board, 'Board pieces').pieces, 'Pieces');
  else pieces = Object.keys(object(data.usage, 'Usage')).map(p => text(p, 'Piece'));

  const frequencies = data.word_frequencies === undefined ? {} : object(data.word_frequencies, 'Word frequencies');
  const rawSolutions = data.solutions === undefined
    ? Object.keys(frequencies).map(word => ({ word, frequency: frequencies[word] }))
    : data.solutions;
  if (!Array.isArray(rawSolutions)) throw new Error('Solutions must be an array.');
  const solutions: Solution[] = rawSolutions.map(raw => {
    const entry = object(raw, 'Solution');
    const word = text(entry.word, 'Word');
    const constructions = deriveConstructions(word, pieces);
    let supplied: unknown[] = [];
    if (entry.pieces !== undefined) supplied = [entry.pieces];
    if (entry.constructions !== undefined) {
      if (!Array.isArray(entry.constructions) || !entry.constructions.length) throw new Error(`${word}: constructions must be a nonempty array.`);
      supplied = [...supplied, ...entry.constructions];
    }
    for (const parts of supplied) {
      const normalized = texts(parts, `${word} construction`);
      validateConstruction(word, normalized, pieces);
    }
    return { word, constructions: constructions as Construction[], frequency: number(entry.frequency ?? frequencies[word], `${word} frequency`) };
  });
  const board: OctagramBoard = {
    pieces, solutions,
    score: number(data.score, 'Score'),
    layout: data.layout === undefined ? undefined : texts(data.layout, 'Layout'),
  };
  validateBoard(board);
  return board;
}
