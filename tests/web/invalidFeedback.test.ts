import { expect, test } from 'vitest';
import { invalidRouteChanges } from '../../src/game/wordDetection';
import type { Graph } from '../../src/types/game';
const graph: Graph = {
  nodes: ['a', 'b', 'c', 'd'], edges: [],
  wordPaths: [{ id: 'route', nodes: ['a', 'b', 'c'], color: '#326b91' }],
};
const targets = new Set(['tester', 'planet']);
const empty = { a: null, b: null, c: null, d: null };

test('only completed invalid routes give feedback', () => {
  expect(invalidRouteChanges(graph, empty, { ...empty, a: 'te', b: 'st' }, targets)).toEqual([]);
  expect(invalidRouteChanges(graph, empty, { ...empty, a: 'te', b: 'st', c: 'er' }, targets)).toEqual([]);
  expect(invalidRouteChanges(graph, empty, { ...empty, a: 'er', b: 'st', c: 'te' }, targets)).toEqual(['route']);
});
test('any valid target on the route counts, regardless of original construction', () => {
  expect(invalidRouteChanges(graph, empty, { ...empty, a: 'pl', b: 'an', c: 'et' }, targets)).toEqual([]);
});
test('unchanged routes, unrelated moves, removal, and reset do not flash', () => {
  const wrong = { ...empty, a: 'er', b: 'st', c: 'te' };
  expect(invalidRouteChanges(graph, wrong, wrong, targets)).toEqual([]);
  expect(invalidRouteChanges(graph, wrong, { ...wrong, d: 'al' }, targets)).toEqual([]);
  expect(invalidRouteChanges(graph, wrong, { ...wrong, c: null }, targets)).toEqual([]);
  expect(invalidRouteChanges(graph, wrong, empty, targets)).toEqual([]);
});
test('changing a complete word into an invalid word triggers new feedback', () => {
  const valid = { ...empty, a: 'te', b: 'st', c: 'er' };
  expect(invalidRouteChanges(graph, valid, { ...valid, b: 'al' }, targets)).toEqual(['route']);
});
