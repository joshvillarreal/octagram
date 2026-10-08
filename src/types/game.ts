export type Construction = [string, string, string];
export type NodeId = string;
export type Placement = Record<NodeId, string | null>;

export interface Solution {
  word: string;
  constructions: Construction[];
  frequency?: number;
}

export interface OctagramBoard {
  pieces: string[];
  solutions: Solution[];
  score?: number;
  /** Piece order around the octagon, clockwise from the top. */
  layout?: string[];
}

export interface GraphEdge {
  from: NodeId;
  to: NodeId;
  weight: number;
}

export interface Graph {
  nodes: NodeId[];
  edges: GraphEdge[];
  wordPaths?: WordPath[];
}

export interface WordPath {
  id: string;
  nodes: [NodeId, NodeId, NodeId];
  color: string;
}

export interface PieceEdge {
  from: string;
  to: string;
  weight: number;
}

export interface Point { x: number; y: number }
