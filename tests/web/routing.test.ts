import { expect, test } from 'vitest';
import fixture from '../../src/data/exampleBoard.json';
import { parseBoard } from '../../src/game/boardParser';
import { buildGraph } from '../../src/game/graph';
import { edgeGeometry, innerCircleRadius, nodePoint, SLOT_HEIGHT, SLOT_WIDTH, wordCurve } from '../../src/game/layout';
import { buildWordArrows } from '../../src/game/wordArrows';
import type { Point } from '../../src/types/game';

function sample(start: Point, control: Point, end: Point, t: number): Point {
  return {
    x: (1 - t) ** 2 * start.x + 2 * t * (1 - t) * control.x + t ** 2 * end.x,
    y: (1 - t) ** 2 * start.y + 2 * t * (1 - t) * control.y + t ** 2 * end.y,
  };
}
function insideBox(point: Point, index: number, height: number): boolean {
  const center = nodePoint(index);
  return Math.abs(point.x - center.x) <= SLOT_WIDTH / 2 && Math.abs(point.y - center.y) <= height / 2;
}

test('every direction and crowded lane stays inside the circle and outside all eight boxes', () => {
  for (const width of [600, 340, 288]) {
    const height = Math.max(SLOT_HEIGHT, 44 * 600 / width);
    const radius = innerCircleRadius(height);
    for (let from = 0; from < 8; from++) {
      for (let to = 0; to < 8; to++) {
        if (from === to) continue;
        for (const lane of [0, 1, 5, 50]) {
          const { start, control, end } = edgeGeometry(from, to, lane, -0.16, 0.16, radius);
          for (let step = 0; step <= 40; step++) {
            const point = sample(start, control, end, step / 40);
            expect(Math.hypot(point.x - 300, point.y - 300)).toBeLessThanOrEqual(radius + 1e-8);
            for (let box = 0; box < 8; box++) expect(insideBox(point, box, height)).toBe(false);
          }
        }
      }
    }
  }
});

test('each arrow receives separate incoming and outgoing ports', () => {
  const graph = buildGraph(parseBoard({ ...fixture, layout: fixture.pieces }));
  const arrows = buildWordArrows(graph);
  const ports = arrows.flatMap(arrow => {
    const { start, end } = arrow.geometry;
    return [`${start.x}:${start.y}`, `${end.x}:${end.y}`];
  });
  expect(new Set(ports).size).toBe(arrows.length * 2);
});

test('the circle leaves room for arrowheads and adapts to mobile box minimum heights', () => {
  const desktop = innerCircleRadius();
  const mobile = innerCircleRadius(44 * 600 / 288);
  expect(mobile).toBeLessThan(desktop);
  for (let index = 0; index < 8; index++) {
    const center = nodePoint(index);
    const closest = Math.hypot(Math.max(0, Math.abs(center.x - 300) - SLOT_WIDTH / 2), Math.max(0, Math.abs(center.y - 300) - SLOT_HEIGHT / 2));
    expect(desktop + 5).toBeLessThan(closest);
  }
});

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  return {
    x: (1 - t) ** 3 * a.x + 3 * (1 - t) ** 2 * t * b.x + 3 * (1 - t) * t ** 2 * c.x + t ** 3 * d.x,
    y: (1 - t) ** 3 * a.y + 3 * (1 - t) ** 2 * t * b.y + 3 * (1 - t) * t ** 2 * c.y + t ** 3 * d.y,
  };
}

test('continuous swoops graze the middle position and avoid every box on desktop and mobile', () => {
  for (const width of [600, 288]) {
    const height = Math.max(SLOT_HEIGHT, 44 * 600 / width);
    const radius = innerCircleRadius(height);
    for (let from = 0; from < 8; from++) for (let via = 0; via < 8; via++) for (let to = 0; to < 8; to++) {
      if (new Set([from, via, to]).size !== 3) continue;
      const curve = wordCurve(from, via, to, -0.16, 12, 0.16, radius, 2);
      expect(insideBox(curve.middle, via, height)).toBe(false);
      expect(Math.hypot(curve.middle.x - 300, curve.middle.y - 300)).toBeCloseTo(radius - 2);
      expect(curve.middle.x - curve.incomingControl.x).toBeCloseTo(curve.outgoingControl.x - curve.middle.x);
      expect(curve.middle.y - curve.incomingControl.y).toBeCloseTo(curve.outgoingControl.y - curve.middle.y);
      for (let step = 0; step <= 30; step++) {
        const t = step / 30;
        const points = [cubic(curve.start, curve.firstControl, curve.incomingControl, curve.middle, t), cubic(curve.middle, curve.outgoingControl, curve.lastControl, curve.end, t)];
        for (const point of points) for (let box = 0; box < 8; box++) {
          expect(insideBox(point, box, height)).toBe(false);
          expect(Math.hypot(point.x - 300, point.y - 300)).toBeLessThanOrEqual(radius + 1e-8);
        }
      }
    }
  }
});
