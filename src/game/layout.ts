import type { PieceEdge, Point } from '../types/game';

export const VIEW_SIZE = 600;
export const SLOT_WIDTH = 90;
export const SLOT_HEIGHT = 72;
export function nodePoint(index: number): Point {
  const angle = index * Math.PI / 4 - Math.PI / 2;
  return { x: 300 + 230 * Math.cos(angle), y: 300 + 230 * Math.sin(angle) };
}
function insideArc(start: number, end: number, point: number): boolean {
  return (point - start + 8) % 8 < (end - start + 8) % 8;
}
function layoutCost(layout: string[], edges: PieceEdge[]): number {
  const positions = new Map(layout.map((piece, index) => [piece, index]));
  const chords = edges.map(edge => ({ a: positions.get(edge.from)!, b: positions.get(edge.to)!, weight: edge.weight }));
  let cost = 0;
  for (let i = 0; i < chords.length; i++) {
    const { a, b, weight } = chords[i];
    const span = Math.min(Math.abs(a - b), 8 - Math.abs(a - b));
    cost += span * span * Math.sqrt(weight);
    for (let j = 0; j < i; j++) {
      const other = chords[j];
      if (new Set([a, b, other.a, other.b]).size < 4) continue;
      if (insideArc(a, b, other.a) !== insideArc(a, b, other.b)) cost += 20 * Math.sqrt(weight * other.weight);
    }
  }
  return cost;
}

/** Rotations are equivalent, so fix one node and evaluate all 7! remaining orders. */
export function chooseLayout(pieces: string[], edges: PieceEdge[]): string[] {
  const sorted = [...pieces].sort();
  let best = [...sorted], bestCost = Infinity;
  function visit(prefix: string[], remaining: string[]) {
    if (!remaining.length) {
      const cost = layoutCost(prefix, edges);
      if (cost < bestCost) { best = [...prefix]; bestCost = cost; }
      return;
    }
    remaining.forEach((piece, index) => visit([...prefix, piece], remaining.filter((_, i) => i !== index)));
  }
  visit([sorted[0]], sorted.slice(1));
  return best;
}

/** Largest central disk clear of all axis-aligned slots, with marker/stroke padding. */
export function innerCircleRadius(slotHeight = SLOT_HEIGHT): number {
  return Math.min(...Array.from({ length: 8 }, (_, index) => {
    const point = nodePoint(index);
    const dx = Math.max(0, Math.abs(point.x - 300) - SLOT_WIDTH / 2);
    const dy = Math.max(0, Math.abs(point.y - 300) - slotHeight / 2);
    return Math.hypot(dx, dy);
  })) - 7;
}

function circlePoint(angle: number, radius: number): Point {
  return { x: 300 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) };
}

/** All three quadratic control points lie in the inner disk, so the entire curve does too. */
export function edgeGeometry(
  from: number, to: number, lane = 0,
  startPort = 0, endPort = 0, radius = innerCircleRadius(),
): { start: Point; control: Point; end: Point } {
  const start = circlePoint(from * Math.PI / 4 - Math.PI / 2 + startPort, radius);
  const end = circlePoint(to * Math.PI / 4 - Math.PI / 2 + endPort, radius);
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const bend = 30 + 26 * lane;
  let control = {
    x: (start.x + end.x) / 2 - dy / distance * bend,
    y: (start.y + end.y) / 2 + dx / distance * bend,
  };
  const controlRadius = Math.hypot(control.x - 300, control.y - 300);
  // Keep control points deeper inside than ports, including crowded parallel lanes.
  const limit = radius * 0.82;
  if (controlRadius > limit) control = {
    x: 300 + (control.x - 300) * limit / controlRadius,
    y: 300 + (control.y - 300) * limit / controlRadius,
  };
  return { start, control, end };
}

export function edgePath(from: number, to: number, lane = 0, startPort = 0, endPort = 0, radius = innerCircleRadius()): string {
  const { start, control, end } = edgeGeometry(from, to, lane, startPort, endPort, radius);
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

export interface WordCurve {
  start: Point;
  firstControl: Point;
  incomingControl: Point;
  middle: Point;
  outgoingControl: Point;
  lastControl: Point;
  end: Point;
}

/** Tangent-matched cubic sections graze the middle slot while staying inside the clear disk. */
export function wordCurve(
  from: number, via: number, to: number,
  startPort = 0, middleOffset = 0, endPort = 0,
  radius = innerCircleRadius(), lane = 0,
): WordCurve {
  const first = edgeGeometry(from, via, lane, startPort, 0, radius);
  const last = edgeGeometry(via, to, lane, 0, endPort, radius);
  const angle = via * Math.PI / 4 - Math.PI / 2 + middleOffset / radius;
  const radialX = Math.cos(angle), radialY = Math.sin(angle);
  let tangent = { x: -radialY, y: radialX };
  if (tangent.x * (last.end.x - first.start.x) + tangent.y * (last.end.y - first.start.y) < 0) {
    tangent = { x: -tangent.x, y: -tangent.y };
  }
  const middle = circlePoint(angle, radius - 2);
  return {
    start: first.start, firstControl: first.control,
    incomingControl: { x: middle.x - tangent.x * 12, y: middle.y - tangent.y * 12 },
    middle,
    outgoingControl: { x: middle.x + tangent.x * 12, y: middle.y + tangent.y * 12 },
    lastControl: last.control, end: last.end,
  };
}
export function wordCurvePath(curve: WordCurve): string {
  const { start: a, firstControl: b, incomingControl: c, middle: d, outgoingControl: e, lastControl: f, end: g } = curve;
  return `M ${a.x} ${a.y} C ${b.x} ${b.y} ${c.x} ${c.y} ${d.x} ${d.y} C ${e.x} ${e.y} ${f.x} ${f.y} ${g.x} ${g.y}`;
}
