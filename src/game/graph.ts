import type { Graph, OctagramBoard, PieceEdge } from '../types/game';
import { chooseLayout } from './layout';
import { wordColor } from './wordArrows';

export function buildPieceEdges(board: OctagramBoard): PieceEdge[] {
  const edges = new Map<string, PieceEdge>();
  for (const solution of board.solutions) {
    for (const construction of solution.constructions) {
      for (let i = 0; i < 2; i++) {
        const from = construction[i], to = construction[i + 1];
        const key = `${from}:${to}`;
        const edge = edges.get(key);
        if (edge) edge.weight++;
        else edges.set(key, { from, to, weight: 1 });
      }
    }
  }
  return [...edges.values()].sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}

export function buildGraph(board: OctagramBoard): Graph {
  const pieceEdges = buildPieceEdges(board);
  const layout = board.layout ?? chooseLayout(board.pieces, pieceEdges);
  const nodes = layout.map((_, index) => `node-${index}`);
  const nodeForPiece = new Map(layout.map((piece, index) => [piece, nodes[index]]));
  return {
    nodes,
    edges: pieceEdges.map(edge => ({ from: nodeForPiece.get(edge.from)!, to: nodeForPiece.get(edge.to)!, weight: edge.weight })),
    wordPaths: [...board.solutions].sort((a, b) => a.word.localeCompare(b.word)).flatMap((solution, index) =>
      solution.constructions.map((construction, alternative) => ({
        id: `route-${index}-${alternative}`,
        nodes: construction.map(piece => nodeForPiece.get(piece)!) as [string, string, string],
        color: wordColor(index),
      }))),
  };
}
