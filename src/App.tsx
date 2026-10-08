import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent } from '@dnd-kit/core';
import initialData from './data/musicianBoard.json';
import { parseBoard } from './game/boardParser';
import { buildGraph } from './game/graph';
import { bankPieces, emptyPlacement, movePiece, shuffle, shuffleBank } from './game/gameState';
import { detectWordColors, isSolved } from './game/wordDetection';
import { OctagramBoard } from './components/OctagramBoard';
import { PieceBank } from './components/PieceBank';
import { WordsPanel } from './components/WordsPanel';
import { CompletionBanner } from './components/CompletionBanner';

function prepare(data: unknown) {
  const board = parseBoard(data);
  return { board, graph: buildGraph(board) };
}
const collisionDetection: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export default function App() {
  const [puzzle, setPuzzle] = useState(() => prepare(initialData));
  const { board, graph } = puzzle;
  const [placement, setPlacement] = useState(() => emptyPlacement(graph));
  const [order, setOrder] = useState(() => shuffle(board.pieces));
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suppressClick = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const targetWords = useMemo(() => new Set(board.solutions.map(s => s.word)), [board]);
  const wordColors = detectWordColors(graph, placement, targetWords);
  const words = Object.keys(wordColors).sort();
  const solved = isSolved(graph, placement, words, targetWords);
  const bank = bankPieces(board.pieces, placement, order);
  const placedCount = graph.nodes.filter(node => placement[node]).length;

  function select(piece: string) {
    if (suppressClick.current) return;
    setSelected(current => current === piece ? null : piece);
  }
  function place(piece: string, destination: string) {
    setPlacement(current => movePiece(current, board.pieces, piece, destination));
    setSelected(null);
  }
  function dragEnd(event: DragEndEvent) {
    if (event.over) place(String(event.active.id), String(event.over.id));
    setActive(null);
    suppressClick.current = true;
    window.setTimeout(() => { suppressClick.current = false; }, 0);
  }
  function reset() {
    setPlacement(emptyPlacement(graph));
    setSelected(null);
  }
  async function loadBoard(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const next = prepare(JSON.parse(await file.text()));
      setPuzzle(next);
      setPlacement(emptyPlacement(next.graph));
      setOrder(shuffle(next.board.pieces));
      setSelected(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to read board JSON.');
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header"><div className="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 3h10l8 8v10l-8 8H11l-8-8V11Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="3" fill="currentColor" /></svg><h1>Octagram</h1></div><span className="edition">THE WORD GRAPH</span></header>
      <div className="game-toolbar"><p>Eight pieces. One arrangement. Every word.</p><div className="toolbar-actions"><button type="button" className="text-button" onClick={reset}>Reset</button><label className="load-button">Load puzzle<input type="file" accept=".json,application/json" onChange={loadBoard} aria-label="Load puzzle JSON" /></label></div></div>
      {error && <div className="error-banner" role="alert"><strong>Could not load this puzzle.</strong> {error}<button type="button" className="text-button" onClick={() => setError(null)}>Dismiss</button></div>}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={event => { setActive(String(event.active.id)); setSelected(null); }} onDragEnd={dragEnd} onDragCancel={() => setActive(null)}>
        <div className="game-layout">
          <PieceBank pieces={bank} selected={selected} onSelect={select} onReturn={() => selected && place(selected, 'bank')} onShuffle={() => setOrder(current => shuffleBank(board.pieces, placement, current))} />
          <OctagramBoard graph={graph} placement={placement} targetWords={targetWords} selected={selected} solved={solved} onSelect={select} onPlace={id => selected && !suppressClick.current && place(selected, id)} />
          <WordsPanel words={words} total={targetWords.size} colors={wordColors} />
        </div>
        <DragOverlay dropAnimation={null}>{active && <span className="piece-tile overlay-tile">{active.toUpperCase()}</span>}</DragOverlay>
      </DndContext>
      <div className="game-status">{solved ? <CompletionBanner count={words.length} /> : <p>{selected ? `${selected.toUpperCase()} selected. Choose a position, or return it to the bank.` : `${placedCount} of 8 pieces placed. Words appear only while their paths are connected.`}</p>}</div>
      <footer>Follow each colored arrow from its first piece, through the middle piece, to its last. Solve every word at once.</footer>
    </main>
  );
}
