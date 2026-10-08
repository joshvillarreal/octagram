import type { Construction, OctagramBoard } from '../types/game';

export function validateConstruction(word: string, parts: string[], pieces: string[]): asserts parts is Construction {
  if (parts.length !== 3 || new Set(parts).size !== 3) {
    throw new Error(`${word}: a construction must use three distinct pieces.`);
  }
  if (parts.some(part => !pieces.includes(part)) || parts.join('') !== word) {
    throw new Error(`${word}: construction pieces must belong to the board and spell the word.`);
  }
}

export function validateBoard(board: OctagramBoard): void {
  if (board.pieces.length !== 8 || new Set(board.pieces).size !== 8) {
    throw new Error('A board must contain exactly eight unique pieces.');
  }
  if (board.pieces.some(piece => !/^[a-z]{1,3}$/.test(piece))) {
    throw new Error('Pieces must contain one to three ASCII alphabetic characters.');
  }
  if (!board.solutions.length) throw new Error('A board must contain at least one solution.');
  if (new Set(board.solutions.map(s => s.word)).size !== board.solutions.length) {
    throw new Error('Solution words must be unique.');
  }
  for (const solution of board.solutions) {
    if (!/^[a-z]+$/.test(solution.word) || !solution.constructions.length) {
      throw new Error(`${solution.word}: no valid construction was found.`);
    }
    for (const parts of solution.constructions) validateConstruction(solution.word, parts, board.pieces);
    if (solution.frequency !== undefined && (!Number.isFinite(solution.frequency) || solution.frequency < 0)) {
      throw new Error(`${solution.word}: frequency must be finite and nonnegative.`);
    }
  }
  if (board.layout && (board.layout.length !== 8 || new Set(board.layout).size !== 8 || board.layout.some(p => !board.pieces.includes(p)))) {
    throw new Error('Layout must contain each board piece exactly once.');
  }
  if (board.score !== undefined && !Number.isFinite(board.score)) throw new Error('Score must be finite.');
}
