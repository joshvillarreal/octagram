import { expect, test } from 'vitest';
import musician from '../../src/data/musicianBoard.json';
import { parseBoard } from '../../src/game/boardParser';
import { buildGraph, buildPieceEdges } from '../../src/game/graph';
import { chooseLayout } from '../../src/game/layout';
import { bankPieces, emptyPlacement } from '../../src/game/gameState';
import { detectWords, isSolved } from '../../src/game/wordDetection';

test('the musician round starts empty and can form all nine words simultaneously', () => {
  const board = parseBoard(musician);
  const graph = buildGraph(board);
  const targets = new Set(board.solutions.map(s => s.word));
  expect(board.pieces).toEqual(['al', 'com', 'ed', 'ian', 'ic', 'mag', 'mus', 'ter']);
  expect(targets.has('musician')).toBe(true);
  expect(targets.size).toBe(9);
  const initial = emptyPlacement(graph);
  expect(bankPieces(board.pieces, initial, board.pieces)).toHaveLength(8);
  expect(detectWords(graph, initial, targets)).toEqual([]);
  expect(isSolved(graph, initial, [], targets)).toBe(false);
  const layout = chooseLayout(board.pieces, buildPieceEdges(board));
  const solved = Object.fromEntries(graph.nodes.map((node, i) => [node, layout[i]]));
  const words = detectWords(graph, solved, targets);
  expect(words).toEqual([...targets].sort());
  expect(isSolved(graph, solved, words, targets)).toBe(true);
});
