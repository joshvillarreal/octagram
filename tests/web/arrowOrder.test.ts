import { expect, test } from 'vitest';
import { maximizeVisibleHeads } from '../../src/game/arrowOrder';
import { obscuresHead } from '../../src/game/wordArrows';
import { wordCurve } from '../../src/game/layout';

function visible(order: { id: string; headBlockers: string[] }[]): number {
  return order.filter((arrow, i) => !order.slice(i + 1).some(other => arrow.headBlockers.includes(other.id))).length;
}
function permutations<T>(items: T[]): T[][] {
  return items.length ? items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [item, ...rest])) : [[]];
}
test('whole-arrow ordering maximizes visible heads even with conflicting cycles', () => {
  const arrows = [
    { id: 'a', headBlockers: ['b', 'd'] }, { id: 'b', headBlockers: ['c'] },
    { id: 'c', headBlockers: ['a'] }, { id: 'd', headBlockers: [] },
  ];
  const result = maximizeVisibleHeads(arrows);
  expect(visible(result)).toBe(Math.max(...permutations(arrows).map(visible)));
  expect(maximizeVisibleHeads(arrows)).toEqual(result);
  expect(result).toHaveLength(arrows.length);
});
test('completion and selection remain hard stacking constraints', () => {
  const arrows = [
    { id: 'a', headBlockers: ['b'], completed: false },
    { id: 'b', headBlockers: ['c'], completed: false },
    { id: 'c', headBlockers: ['a'], completed: true },
  ];
  const result = maximizeVisibleHeads(arrows);
  expect(result[0].id).toBe('c');
  const focused = maximizeVisibleHeads(arrows, 'c');
  expect(focused.at(-1)!.id).toBe('c');
  const candidates = permutations(arrows).filter(order => order[0].completed);
  expect(visible(result)).toBe(Math.max(...candidates.map(visible)));
});
test('head overlap checks use route geometry and include nearby opaque outlines', () => {
  const curve = wordCurve(0, 2, 4);
  expect(obscuresHead(curve, curve)).toBe(true);
  const far = wordCurve(1, 3, 5);
  expect(obscuresHead(curve, far)).toBe(false);
});
