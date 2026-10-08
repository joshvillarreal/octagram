import type { Graph, NodeId, Placement } from '../types/game';

export function emptyPlacement(graph: Graph): Placement {
  return Object.fromEntries(graph.nodes.map(node => [node, null]));
}
export function bankPieces(pieces: string[], placement: Placement, order: string[]): string[] {
  const placed = new Set(Object.values(placement));
  return order.filter(piece => pieces.includes(piece) && !placed.has(piece));
}
export function movePiece(placement: Placement, pieces: string[], piece: string, destination: NodeId | 'bank'): Placement {
  if (!pieces.includes(piece)) throw new Error('Unknown piece.');
  if (destination !== 'bank' && !Object.hasOwn(placement, destination)) throw new Error('Unknown destination.');
  const next = { ...placement };
  const source = Object.keys(next).find(node => next[node] === piece);
  if (source === destination) return next;
  const displaced = destination === 'bank' ? null : next[destination];
  if (source) next[source] = destination === 'bank' ? null : displaced;
  if (destination !== 'bank') next[destination] = piece;
  return next;
}
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function shuffleBank(pieces: string[], placement: Placement, order: string[], random: () => number = Math.random): string[] {
  const bank = shuffle(bankPieces(pieces, placement, order), random);
  let index = 0;
  return order.map(piece => bank.includes(piece) ? bank[index++] : piece);
}
