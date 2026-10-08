import type { Graph, Placement } from '../types/game';
import { maximizeVisibleHeads } from './arrowOrder';
import { formedWord } from './wordDetection';
import { innerCircleRadius, wordCurve, wordCurvePath } from './layout';
import type { WordCurve } from './layout';

export const ARROW_START_WIDTH = 6;
export const ARROW_TIP_WIDTH = 1.4;
export const COMPLETED_ARROW_COLOR = '#c7ccc5';
const COLORS = ['#a34d36', '#326b91', '#687937', '#79519a', '#ae7620', '#258078', '#b44d78', '#57629b', '#786443', '#397c49', '#994b59', '#506a73'];
export function wordColor(index: number): string {
  return COLORS[index] ?? `hsl(${(index * 137.508) % 360} 48% 40%)`;
}
export interface WordArrow {
  id: string;
  routeId: string;
  color: string;
  path: string;
  geometry: WordCurve;
  bodyPath: string;
  headBlockers: string[];
  middleNode: string;
}

/** Live target words retire their actual routes, independent of canonical piece positions. */
export function presentWordArrows(arrows: WordArrow[], graph: Graph, placement: Placement, targetWords: Set<string>, focusedId?: string) {
  const completed = new Set((graph.wordPaths ?? [])
    .filter(route => formedWord(route.nodes, placement, targetWords) !== null)
    .map(route => route.id));
  const styled = arrows.map(arrow => ({
    ...arrow,
    completed: completed.has(arrow.routeId),
    displayColor: completed.has(arrow.routeId) ? COMPLETED_ARROW_COLOR : arrow.color,
  }));
  // SVG paints in DOM order: completed routes go first, unfinished routes remain in front.
  return maximizeVisibleHeads(styled, focusedId);
}

/** One smooth colored arrow per construction, sweeping near its middle slot. */
export function buildWordArrows(graph: Graph, radius = innerCircleRadius()): WordArrow[] {
  const routes = graph.wordPaths ?? [];
  const ports = new Map<string, number>();
  const middleOffsets = new Map<string, number>();
  const middleLanes = new Map<string, number>();
  for (const node of graph.nodes) {
    const incident = routes.flatMap(route => [
      ...(route.nodes[0] === node ? [{ key: `${route.id}:start`, other: route.nodes[1] }] : []),
      ...(route.nodes[2] === node ? [{ key: `${route.id}:end`, other: route.nodes[1] }] : []),
    ]).sort((a, b) => graph.nodes.indexOf(a.other) - graph.nodes.indexOf(b.other) || a.key.localeCompare(b.key));
    incident.forEach((port, index) => ports.set(port.key,
      incident.length <= 1 ? 0 : (index / (incident.length - 1) - 0.5) * 0.32));
    const middleIndex = graph.nodes.indexOf(node);
    // Sort by the tangential position of the endpoints instead of word order.
    // Nearby approaches stay in nearby ports rather than crisscrossing at the tile.
    const approach = (route: typeof routes[number]) =>
      Math.sin((graph.nodes.indexOf(route.nodes[0]) - middleIndex) * Math.PI / 4)
      + Math.sin((graph.nodes.indexOf(route.nodes[2]) - middleIndex) * Math.PI / 4);
    const middleRoutes = routes.filter(route => route.nodes[1] === node)
      .sort((a, b) => approach(a) - approach(b) || a.id.localeCompare(b.id));
    // Grow the fan with congestion, capped within this tile's sector of the disk.
    const span = Math.min(radius * 0.28, Math.max(24, (middleRoutes.length - 1) * 12));
    middleRoutes.forEach((route, index) => {
      middleOffsets.set(route.id, middleRoutes.length <= 1 ? 0 : (index / (middleRoutes.length - 1) - 0.5) * span);
      middleLanes.set(route.id, index);
    });
  }
  const arrows = routes.map(route => {
    const [from, via, to] = route.nodes.map(node => graph.nodes.indexOf(node));
    const geometry = wordCurve(from, via, to, ports.get(`${route.id}:start`),
      middleOffsets.get(route.id), ports.get(`${route.id}:end`), radius, middleLanes.get(route.id) ?? 0);
    return {
      id: route.id, routeId: route.id, color: route.color,
      middleNode: route.nodes[1], geometry, path: wordCurvePath(geometry),
      bodyPath: taperedArrowBody(geometry),
      headBlockers: [] as string[],
    };
  });
  for (const arrow of arrows) arrow.headBlockers = arrows.filter(other => other !== arrow && obscuresHead(arrow.geometry, other.geometry)).map(other => other.id);
  return arrows;
}

function cubicPoint(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return { x: u ** 3 * a.x + 3 * u ** 2 * t * b.x + 3 * u * t ** 2 * c.x + t ** 3 * d.x,
    y: u ** 3 * a.y + 3 * u ** 2 * t * b.y + 3 * u * t ** 2 * c.y + t ** 3 * d.y };
}
export function arrowWidthAt(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return ARROW_START_WIDTH + (ARROW_TIP_WIDTH - ARROW_START_WIDTH) * t;
}

/** A filled ribbon tapers continuously by traveled distance across both cubic sections. */
function ribbonGeometry(curve: WordCurve) {
  const points = Array.from({ length: 129 }, (_, index) => index <= 64
    ? cubicPoint(curve.start, curve.firstControl, curve.incomingControl, curve.middle, index / 64)
    : cubicPoint(curve.middle, curve.outgoingControl, curve.lastControl, curve.end, (index - 64) / 64));
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  const total = lengths[lengths.length - 1];
  const sides = points.map((point, index) => {
    const before = points[Math.max(0, index - 1)], after = points[Math.min(points.length - 1, index + 1)];
    const dx = after.x - before.x, dy = after.y - before.y;
    const scale = arrowWidthAt(lengths[index] / total) / (2 * Math.hypot(dx, dy));
    return { left: { x: point.x - dy * scale, y: point.y + dx * scale }, right: { x: point.x + dy * scale, y: point.y - dx * scale } };
  });
  return { sides, lengths, total };
}
function outlinePath(sides: ReturnType<typeof ribbonGeometry>['sides']): string {
  const outline = [...sides.map(side => side.left), ...sides.map(side => side.right).reverse()];
  return outline.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') + ' Z';
}
export function taperedArrowBody(curve: WordCurve): string {
  return outlinePath(ribbonGeometry(curve).sides);
}

function headPolygon(curve: WordCurve) {
  const dx = curve.end.x - curve.lastControl.x, dy = curve.end.y - curve.lastControl.y;
  const length = Math.hypot(dx, dy), ux = dx / length, uy = dy / length;
  // SVG marker: 7px wide, refX=9 in a 10-unit viewBox.
  return [[-6.3, -3.5], [.7, 0], [-6.3, 3.5]].map(([x, y]) => ({ x: curve.end.x + ux * x - uy * y, y: curve.end.y + uy * x + ux * y }));
}
type Vertex = { x: number; y: number };
function pointSegmentDistance(p: Vertex, a: Vertex, b: Vertex): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function insidePolygon(p: Vertex, polygon: Vertex[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function polygonsOverlap(a: Vertex[], b: Vertex[]): boolean {
  if (insidePolygon(a[0], b) || insidePolygon(b[0], a)) return true;
  const cross = (p: Vertex, q: Vertex, r: Vertex) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i], q = a[(i + 1) % a.length], r = b[j], s = b[(j + 1) % b.length];
    if (Math.max(p.x, q.x) < Math.min(r.x, s.x) - 3 || Math.max(r.x, s.x) < Math.min(p.x, q.x) - 3
      || Math.max(p.y, q.y) < Math.min(r.y, s.y) - 3 || Math.max(r.y, s.y) < Math.min(p.y, q.y) - 3) continue;
    if (cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0) return true;
    // Account for the 1.5px visible border extending from both outlines.
    if (Math.min(pointSegmentDistance(p, r, s), pointSegmentDistance(q, r, s), pointSegmentDistance(r, p, q), pointSegmentDistance(s, p, q)) <= 3) return true;
  }
  return false;
}
export function obscuresHead(head: WordCurve, blocker: WordCurve): boolean {
  const sides = ribbonGeometry(blocker).sides;
  const body = [...sides.map(side => side.left), ...sides.map(side => side.right).reverse()];
  return polygonsOverlap(headPolygon(head), body) || polygonsOverlap(headPolygon(head), headPolygon(blocker));
}
