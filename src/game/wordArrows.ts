import type { Graph, Placement } from '../types/game';
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
  middleNode: string;
}

/** Live target words retire their actual routes, independent of canonical piece positions. */
export function presentWordArrows(arrows: WordArrow[], graph: Graph, placement: Placement, targetWords: Set<string>) {
  const completed = new Set((graph.wordPaths ?? [])
    .filter(route => formedWord(route.nodes, placement, targetWords) !== null)
    .map(route => route.id));
  const styled = arrows.map(arrow => ({
    ...arrow,
    completed: completed.has(arrow.routeId),
    displayColor: completed.has(arrow.routeId) ? COMPLETED_ARROW_COLOR : arrow.color,
  }));
  // SVG paints in DOM order: completed routes go first, unfinished routes remain in front.
  return [...styled.filter(arrow => arrow.completed), ...styled.filter(arrow => !arrow.completed)];
}

/** One smooth colored arrow per construction, sweeping near its middle slot. */
export function buildWordArrows(graph: Graph, radius = innerCircleRadius()): WordArrow[] {
  const routes = graph.wordPaths ?? [];
  const ports = new Map<string, number>();
  const middleOffsets = new Map<string, number>();
  for (const node of graph.nodes) {
    const incident = routes.flatMap(route => [
      ...(route.nodes[0] === node ? [{ key: `${route.id}:start`, other: route.nodes[1] }] : []),
      ...(route.nodes[2] === node ? [{ key: `${route.id}:end`, other: route.nodes[1] }] : []),
    ]).sort((a, b) => graph.nodes.indexOf(a.other) - graph.nodes.indexOf(b.other) || a.key.localeCompare(b.key));
    incident.forEach((port, index) => ports.set(port.key,
      incident.length <= 1 ? 0 : (index / (incident.length - 1) - 0.5) * 0.32));
    const middleRoutes = routes.filter(route => route.nodes[1] === node);
    middleRoutes.forEach((route, index) => middleOffsets.set(route.id,
      middleRoutes.length <= 1 ? 0 : (index / (middleRoutes.length - 1) - 0.5) * 24));
  }
  return routes.map((route, index) => {
    const [from, via, to] = route.nodes.map(node => graph.nodes.indexOf(node));
    const geometry = wordCurve(from, via, to, ports.get(`${route.id}:start`),
      middleOffsets.get(route.id), ports.get(`${route.id}:end`), radius, index % 3);
    return {
      id: route.id, routeId: route.id, color: route.color,
      middleNode: route.nodes[1], geometry, path: wordCurvePath(geometry),
      bodyPath: taperedArrowBody(geometry),
    };
  });
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
export function taperedArrowBody(curve: WordCurve): string {
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
  const outline = [...sides.map(side => side.left), ...sides.map(side => side.right).reverse()];
  return outline.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ') + ' Z';
}
