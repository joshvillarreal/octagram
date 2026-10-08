import { expect, test } from 'vitest';
import fixture from '../../src/data/exampleBoard.json';
import { parseBoard } from '../../src/game/boardParser';
import { buildGraph } from '../../src/game/graph';
import { ARROW_START_WIDTH, ARROW_TIP_WIDTH, arrowWidthAt, buildWordArrows, presentWordArrows, COMPLETED_ARROW_COLOR } from '../../src/game/wordArrows';
import { detectWordColors, detectWords } from '../../src/game/wordDetection';
import { emptyPlacement } from '../../src/game/gameState';
import type { Graph } from '../../src/types/game';

const graph = buildGraph(parseBoard({ ...fixture, layout: fixture.pieces }));
const node = (piece: string) => graph.nodes[fixture.pieces.indexOf(piece)];
const targets = new Set(fixture.solutions.map(s => s.word));

test('each construction has one continuous colored arrow, tapered from start to tip', () => {
  const arrows = buildWordArrows(graph);
  expect(arrows).toHaveLength(9);
  expect(new Set(arrows.map(arrow => arrow.color)).size).toBe(9);
  for (const route of graph.wordPaths!) {
    const pair = arrows.filter(arrow => arrow.routeId === route.id);
    expect(pair).toHaveLength(1);
    expect(pair.map(arrow => arrow.color)).toEqual([route.color]);
    expect(pair[0].path.match(/ C /g)).toHaveLength(2);
    expect(pair[0].path.match(/M /g)).toHaveLength(1);
    expect(pair[0].middleNode).toBe(route.nodes[1]);
  }
  expect(arrowWidthAt(0)).toBe(ARROW_START_WIDTH);
  expect(arrowWidthAt(1)).toBeCloseTo(ARROW_TIP_WIDTH);
  expect(arrowWidthAt(0)).toBeGreaterThan(arrowWidthAt(0.5));
  expect(arrowWidthAt(0.5)).toBeGreaterThan(arrowWidthAt(1));
  expect(arrows.every(arrow => arrow.bodyPath.endsWith(' Z'))).toBe(true);
});

test('shared connections fan into distinct lanes instead of merging', () => {
  const arrows = buildWordArrows(graph);
  const sharedRoutes = graph.wordPaths!.filter(route => route.nodes[0] === node('he') && route.nodes[1] === node('al'));
  const lanes = sharedRoutes.map(route => arrows.find(arrow => arrow.id === route.id)!);
  expect(lanes).toHaveLength(3);
  expect(new Set(lanes.map(arrow => arrow.path)).size).toBe(3);
  expect(new Set(lanes.map(arrow => arrow.color)).size).toBe(3);
  expect(buildWordArrows(graph)).toEqual(arrows);
});

test('mixed-color paths do not accidentally form a target word', () => {
  const mixed: Graph = {
    nodes: ['a', 'b', 'c', 'd', 'e'],
    edges: [{ from: 'a', to: 'b', weight: 1 }, { from: 'b', to: 'd', weight: 1 }, { from: 'e', to: 'b', weight: 1 }, { from: 'b', to: 'c', weight: 1 }],
    wordPaths: [{ id: 'one', nodes: ['a', 'b', 'd'], color: '#326b91' }, { id: 'two', nodes: ['e', 'b', 'c'], color: '#a34d36' }],
  };
  const placement = { a: 'he', b: 'ad', c: 'er', d: null, e: null };
  expect(detectWords(mixed, placement, new Set(['header']))).toEqual([]);
  expect(detectWords({ nodes: mixed.nodes, edges: mixed.edges }, placement, new Set(['header']))).toEqual(['header']);
});

test('formed words match the actual route color and disappear when broken', () => {
  const route = graph.wordPaths!.find(path => path.nodes.join(':') === [node('he'), node('ad'), node('er')].join(':'))!;
  const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('ad')]: 'ad', [node('er')]: 'ing' };
  // Another target word on this route is valid: canonical word assignments are not enforced.
  expect(detectWordColors(graph, placement, targets)).toEqual({ heading: [route.color] });
  placement[node('er')] = null;
  expect(detectWordColors(graph, placement, targets)).toEqual({});
});

test('the visible ribbon tapers across the full word without widening again at the middle', () => {
  const arrow = buildWordArrows(graph)[0];
  const numbers = arrow.bodyPath.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
  expect(numbers.every(Number.isFinite)).toBe(true);
  const points = Array.from({ length: numbers.length / 2 }, (_, i) => ({ x: numbers[i * 2], y: numbers[i * 2 + 1] }));
  const count = points.length / 2;
  const widths = Array.from({ length: count }, (_, i) => Math.hypot(points[i].x - points[points.length - 1 - i].x, points[i].y - points[points.length - 1 - i].y));
  expect(widths[0]).toBeCloseTo(ARROW_START_WIDTH);
  expect(widths[widths.length - 1]).toBeCloseTo(ARROW_TIP_WIDTH);
  for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThanOrEqual(widths[i - 1] + 1e-8);
});

test('a target word on any route turns its arrow gray and moves it behind unfinished arrows', () => {
  const arrows = buildWordArrows(graph);
  const route = graph.wordPaths!.find(path => path.nodes.join(':') === [node('he'), node('al'), node('th')].join(':'))!;
  const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('al')]: 'ad', [node('th')]: 'er' };
  const presented = presentWordArrows(arrows, graph, placement, targets);
  expect(presented[0].id).toBe(route.id);
  expect(presented[0].completed).toBe(true);
  expect(presented[0].displayColor).toBe(COMPLETED_ARROW_COLOR);
  expect(presented.slice(1).every(arrow => !arrow.completed && arrow.displayColor === arrow.color)).toBe(true);
  expect(arrows.find(arrow => arrow.id === route.id)!.color).toBe(route.color);
});

test('breaking a word immediately restores its arrow color and normal ordering', () => {
  const arrows = buildWordArrows(graph);
  const route = graph.wordPaths!.find(path => path.nodes.join(':') === [node('he'), node('ad'), node('er')].join(':'))!;
  const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('ad')]: 'ad', [node('er')]: 'er' };
  expect(presentWordArrows(arrows, graph, placement, targets).find(a => a.id === route.id)!.completed).toBe(true);
  placement[node('er')] = null;
  const restored = presentWordArrows(arrows, graph, placement, targets);
  expect(restored.map(arrow => arrow.id)).toEqual(presentWordArrows(arrows, graph, emptyPlacement(graph), targets).map(arrow => arrow.id));
  expect(restored.every(arrow => !arrow.completed && arrow.displayColor === arrow.color)).toBe(true);
});

test('non-target words remain colored and do not move backward', () => {
  const arrows = buildWordArrows(graph);
  const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('ad')]: 'ad', [node('er')]: 'th' };
  const presented = presentWordArrows(arrows, graph, placement, targets);
  expect(presented.every(arrow => !arrow.completed)).toBe(true);
  expect(presented.map(arrow => arrow.id)).toEqual(presentWordArrows(arrows, graph, emptyPlacement(graph), targets).map(arrow => arrow.id));
});
