import type { Graph, Placement } from '../types/game';

export function formedWord(nodes: string[], placement: Placement, targetWords: Set<string>): string | null {
  if (new Set(nodes).size !== 3) return null;
  const pieces = nodes.map(node => placement[node]);
  if (pieces.some(piece => !piece)) return null;
  const word = pieces.join('');
  return targetWords.has(word) ? word : null;
}

/** Only complete same-color routes count; vocabulary is still the supplied target set. */
export function detectWordColors(graph: Graph, placement: Placement, targetWords: Set<string>): Record<string, string[]> {
  const matches: Record<string, string[]> = {};
  function record(nodes: string[], color?: string) {
    const candidate = formedWord(nodes, placement, targetWords);
    if (!candidate) return;
    matches[candidate] ??= [];
    if (color && !matches[candidate].includes(color)) matches[candidate].push(color);
  }
  if (graph.wordPaths) {
    for (const route of graph.wordPaths) record(route.nodes, route.color);
  } else {
    // Compatibility with anonymous graphs supplied without per-word routing data.
    for (const first of graph.edges) {
      for (const second of graph.edges) {
        if (first.to === second.from) record([first.from, first.to, second.to]);
      }
    }
  }
  return matches;
}
export function detectWords(graph: Graph, placement: Placement, targetWords: Set<string>): string[] {
  return Object.keys(detectWordColors(graph, placement, targetWords)).sort();
}
export function isSolved(graph: Graph, placement: Placement, currentWords: string[], targetWords: Set<string>): boolean {
  return graph.nodes.every(node => Boolean(placement[node]))
    && new Set(graph.nodes.map(node => placement[node])).size === graph.nodes.length
    && currentWords.length === targetWords.size
    && currentWords.every(word => targetWords.has(word));
}
