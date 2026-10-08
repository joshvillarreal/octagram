import { describe, expect, test } from 'vitest';
import fixture from '../../src/data/exampleBoard.json';
import { parseBoard } from '../../src/game/boardParser';
import { deriveConstructions } from '../../src/game/constructions';
import { buildGraph, buildPieceEdges } from '../../src/game/graph';
import { chooseLayout, edgePath, nodePoint } from '../../src/game/layout';
import { bankPieces, emptyPlacement, movePiece, shuffleBank } from '../../src/game/gameState';
import { detectWords, isSolved } from '../../src/game/wordDetection';
import type { Graph, Placement } from '../../src/types/game';

const board = parseBoard({ ...fixture, layout: fixture.pieces });
const graph = buildGraph(board);
const targets = new Set(board.solutions.map(s => s.word));
const node = (piece: string) => graph.nodes[board.pieces.indexOf(piece)];
const canonical = Object.fromEntries(board.pieces.map((piece, index) => [graph.nodes[index], piece]));
function headerPlacement(): Placement {
  return { ...emptyPlacement(graph), [node('he')]: 'he', [node('ad')]: 'ad', [node('er')]: 'er' };
}
const legacy = {
  usage: { ad: 4, al: 4, er: 3, he: 5, imb: 1, ing: 3, le: 4, th: 3 },
  errors: [], valid: true, score: 16.89334377096801,
  word_frequencies: { header: 7585.775750291836, heading: 30199.51720402019, healer: 2089.296130854039, healing: 16982.43652461746, health: 275422.8703338169, leader: 89125.0938133746, leading: 100000, lethal: 7244.359600749898, thimble: 0 },
};

describe('board input and construction derivation', () => {
  test('uses the exact nine-word fixture', () => {
    expect(board.pieces).toEqual(['ad', 'al', 'er', 'he', 'imb', 'ing', 'le', 'th']);
    expect(board.solutions.map(s => s.word)).toEqual(['header', 'heading', 'healer', 'healing', 'health', 'leader', 'leading', 'lethal', 'thimble']);
  });
  test('derives header from legacy usage and frequency data', () => {
    const parsed = parseBoard(legacy);
    expect(parsed.solutions.find(s => s.word === 'header')?.constructions).toEqual([['he', 'ad', 'er']]);
    expect(parsed.solutions.find(s => s.word === 'header')?.frequency).toBe(7585.775750291836);
    expect(parsed.pieces).toEqual(fixture.pieces);
  });
  test('loads full generator results and takes the first result of an array', () => {
    const generated = { board: { pieces: board.pieces }, solutions: board.solutions, valid: true, word_frequencies: legacy.word_frequencies };
    expect(parseBoard([generated]).solutions).toEqual(parseBoard(legacy).solutions);
  });
  test('retains all valid constructions rather than picking the supplied one', () => {
    const pieces = ['con', 'cre', 'te', 'cr', 'ete', 'ab', 'cd', 'ef'];
    const parsed = parseBoard({ pieces, solutions: [{ word: 'concrete', pieces: ['con', 'cre', 'te'] }] });
    expect(parsed.solutions[0].constructions).toHaveLength(2);
    expect(deriveConstructions('concrete', pieces)).toEqual([['con', 'cre', 'te'], ['con', 'cr', 'ete']]);
  });
  test('supports historical one-letter boards but never repeated physical pieces', () => {
    const pieces = ['a', 'bc', 'de', 'fg', 'hi', 'jk', 'lm', 'no'];
    expect(parseBoard({ pieces, solutions: [{ word: 'abcde', pieces: ['a', 'bc', 'de'] }] }).solutions).toHaveLength(1);
    expect(deriveConstructions('abcabcde', pieces)).toHaveLength(0);
  });
  test('rejects invalid, empty, or inconsistent data', () => {
    for (const value of [null, [], {}, { ...fixture, valid: false }, { ...fixture, pieces: ['ad'] }, { ...fixture, pieces: [...fixture.pieces.slice(0, 7), 'ad'] }, { ...fixture, solutions: [] }, { ...fixture, solutions: [{ word: 'impossible' }] }, { ...fixture, solutions: [{ word: 'header', pieces: ['he', 'ad', 'ing'] }] }, { ...fixture, solutions: [{ word: 'header', pieces: ['he', 'he', 'er'] }] }, { ...fixture, solutions: [{ word: 'header', frequency: -1 }] }, { ...fixture, layout: ['ad'] }]) {
      expect(() => parseBoard(value)).toThrow();
    }
  });
});

describe('directed weighted graph', () => {
  test('derives all twelve expected directed edge weights', () => {
    const weights = Object.fromEntries(buildPieceEdges(board).map(e => [`${e.from}:${e.to}`, e.weight]));
    expect(weights).toEqual({ 'he:ad': 2, 'ad:er': 2, 'ad:ing': 2, 'he:al': 3, 'al:er': 1, 'al:ing': 1, 'al:th': 1, 'le:ad': 2, 'le:th': 1, 'th:al': 1, 'th:imb': 1, 'imb:le': 1 });
    expect(Object.values(weights).reduce((sum, weight) => sum + weight, 0)).toBe(18);
    expect(weights['he:er']).toBe(undefined);
  });
  test('anonymous nodes contain no hidden piece labels and honor explicit layout', () => {
    expect(graph.nodes).toEqual(['node-0', 'node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6', 'node-7']);
    expect(graph.edges.find(e => e.from === node('he') && e.to === node('ad'))?.weight).toBe(2);
  });
  test('auto-layout is deterministic regardless of piece input order', () => {
    const edges = buildPieceEdges(board);
    expect(chooseLayout(board.pieces, edges)).toEqual(chooseLayout([...board.pieces].reverse(), edges));
  });
  test('curved reciprocal arcs are separate and clipped outside slot centers', () => {
    const forward = edgePath(0, 3), reverse = edgePath(3, 0);
    expect(forward.includes(' Q ')).toBe(true);
    expect(forward).not.toBe(reverse);
    const control = (path: string) => path.split(' Q ')[1].split(' ').slice(0, 2);
    expect(control(forward)).not.toEqual(control(reverse));
    expect(forward.startsWith(`M ${nodePoint(0).x} ${nodePoint(0).y}`)).toBe(false);
  });
});

describe('live word detection', () => {
  test('starts with no words and recognizes HE → AD → ER', () => {
    expect(detectWords(graph, emptyPlacement(graph), targets)).toEqual([]);
    expect(detectWords(graph, headerPlacement(), targets)).toEqual(['header']);
  });
  test('direction matters', () => {
    const reversed = { ...emptyPlacement(graph), [node('he')]: 'er', [node('ad')]: 'ad', [node('er')]: 'he' };
    expect(detectWords(graph, reversed, targets)).toEqual([]);
  });
  test('partial paths do not count and a broken word disappears immediately', () => {
    const placed = headerPlacement();
    expect(detectWords(graph, placed, targets)).toEqual(['header']);
    const moved = movePiece(placed, board.pieces, 'er', 'bank');
    expect(detectWords(graph, moved, targets)).toEqual([]);
  });
  test('counts only supplied words, not arbitrary shared-edge paths', () => {
    const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('al')]: 'al', [node('th')]: 'th' };
    expect(detectWords(graph, placement, new Set(['header']))).toEqual([]);
  });
  test('uses three distinct nodes even when a graph contains reciprocal edges', () => {
    const reciprocal: Graph = { nodes: ['a', 'b'], edges: [{ from: 'a', to: 'b', weight: 1 }, { from: 'b', to: 'a', weight: 1 }] };
    expect(detectWords(reciprocal, { a: 'he', b: 'ad' }, new Set(['headhe']))).toEqual([]);
  });
  test('multiple constructions still display one word', () => {
    const pieces = ['con', 'cre', 'te', 'cr', 'ete', 'ab', 'cd', 'ef'];
    const parsed = parseBoard({ pieces, layout: pieces, solutions: [{ word: 'concrete' }] });
    const g = buildGraph(parsed);
    const placement: Placement = Object.fromEntries(pieces.map((p, i) => [g.nodes[i], p]));
    expect(detectWords(g, placement, new Set(['concrete']))).toEqual(['concrete']);
    placement[g.nodes[1]] = null;
    expect(detectWords(g, placement, new Set(['concrete']))).toEqual(['concrete']);
  });
});

describe('placement and completion', () => {
  test('bank placement, node swaps, occupied bank drops, and returns conserve all pieces', () => {
    let placed = movePiece(emptyPlacement(graph), board.pieces, 'he', graph.nodes[0]);
    placed = movePiece(placed, board.pieces, 'ad', graph.nodes[1]);
    placed = movePiece(placed, board.pieces, 'he', graph.nodes[1]);
    expect(placed[graph.nodes[0]]).toBe('ad');
    expect(placed[graph.nodes[1]]).toBe('he');
    placed = movePiece(placed, board.pieces, 'er', graph.nodes[1]);
    expect(bankPieces(board.pieces, placed, board.pieces).includes('he')).toBe(true);
    placed = movePiece(placed, board.pieces, 'ad', 'bank');
    const all = [...Object.values(placed).filter(Boolean), ...bankPieces(board.pieces, placed, board.pieces)];
    expect(new Set(all).size).toBe(8);
    expect(all).toHaveLength(8);
  });
  test('rejects unknown pieces and destinations', () => {
    expect(() => movePiece(emptyPlacement(graph), board.pieces, 'xx', graph.nodes[0])).toThrow();
    expect(() => movePiece(emptyPlacement(graph), board.pieces, 'he', 'missing')).toThrow();
  });
  test('shuffle affects bank order only and reset empties words', () => {
    const placed = headerPlacement();
    const before = { ...placed };
    const order = shuffleBank(board.pieces, placed, board.pieces, () => 0);
    expect(placed).toEqual(before);
    expect(bankPieces(board.pieces, placed, order).sort()).toEqual(bankPieces(board.pieces, placed, board.pieces).sort());
    const reset = emptyPlacement(graph);
    expect(bankPieces(board.pieces, reset, order)).toHaveLength(8);
    expect(detectWords(graph, reset, targets)).toEqual([]);
  });
  test('requires all pieces and the complete simultaneous solution set', () => {
    expect(detectWords(graph, canonical, targets)).toEqual([...targets].sort());
    expect(isSolved(graph, canonical, detectWords(graph, canonical, targets), targets)).toBe(true);
    expect(isSolved(graph, headerPlacement(), ['header'], targets)).toBe(false);
    const incomplete = { ...canonical, [node('imb')]: null };
    expect(isSolved(graph, incomplete, [...targets], targets)).toBe(false);
    expect(isSolved(graph, canonical, ['header'], targets)).toBe(false);
  });
  test('accepts an alternate valid labeling, rather than exact canonical placement', () => {
    const pieces = board.pieces;
    const solutions = pieces.map((_, i) => ({ word: pieces[i] + pieces[(i + 1) % 8] + pieces[(i + 2) % 8] }));
    const parsed = parseBoard({ pieces, solutions, layout: pieces });
    const g = buildGraph(parsed);
    const rotated = Object.fromEntries(g.nodes.map((n, i) => [n, pieces[(i + 1) % 8]]));
    const target = new Set(solutions.map(s => s.word));
    expect(isSolved(g, rotated, detectWords(g, rotated, target), target)).toBe(true);
  });
});
