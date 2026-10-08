import { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, pointerWithin, rectIntersection, useSensor, useSensors } from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent } from '@dnd-kit/core';
import { parseBoard } from './game/boardParser';
import { buildGraph } from './game/graph';
import { bankPieces, emptyPlacement, movePiece, shuffle, shuffleBank } from './game/gameState';
import { detectWordColors, formedWord, isSolved } from './game/wordDetection';
import { OctagramBoard } from './components/OctagramBoard';
import { PieceBank } from './components/PieceBank';
import { WordsPanel } from './components/WordsPanel';
import { GameSettings } from './components/GameSettings';
import { savedDifficulty } from './game/difficulty';
import type { Difficulty } from './game/difficulty';
import { savedIncorrectFeedback } from './game/feedbackSettings';
import { savedTheme } from './game/theme';
import type { Theme } from './game/theme';
import { GameHelp } from './components/GameHelp';

function prepare(data: unknown) {
  const board = parseBoard(data);
  return { board, graph: buildGraph(board) };
}
const collisionDetection: CollisionDetection = args => {
  const hits = pointerWithin(args);
  return hits.length ? hits : rectIntersection(args);
};

export default function App() {
  const [round, setRound] = useState<ReturnType<typeof prepare> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(savedDifficulty);
  function changeDifficulty(next: Difficulty) {
    if (next === difficulty) return;
    try { localStorage.setItem('octagram-difficulty', next); } catch { /* Storage is optional. */ }
    setRound(null);
    setDifficulty(next);
  }
  const [theme, setTheme] = useState<Theme>(savedTheme);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  function changeTheme(next: Theme) {
    setTheme(next);
    try { localStorage.setItem('octagram-theme', next); } catch { /* Storage is optional. */ }
  }
  const [incorrectFeedback, setIncorrectFeedback] = useState(savedIncorrectFeedback);
  function changeIncorrectFeedback(enabled: boolean) {
    setIncorrectFeedback(enabled);
    try { localStorage.setItem('octagram-incorrect-feedback', String(enabled)); } catch { /* Storage is optional. */ }
  }
  const settings = <GameSettings incorrectFeedback={incorrectFeedback} onIncorrectFeedbackChange={changeIncorrectFeedback} difficulty={difficulty} onChange={changeDifficulty} theme={theme} onThemeChange={changeTheme} />;
  useEffect(() => {
    const worker = new Worker(new URL('./game/generator.worker.ts', import.meta.url), { type: 'module' });
    setError(null);
    worker.onmessage = event => {
      if (event.data.error) setError(event.data.error);
      else {
        try {
          const next = prepare(event.data.board);
          setRound(next);
          try { sessionStorage.setItem('octagram-last-pieces', [...next.board.pieces].sort().join(':')); } catch { /* Storage may be disabled. */ }
        }
        catch { setError('Unable to prepare this puzzle. Try again.'); }
      }
      worker.terminate();
    };
    worker.onerror = () => { setError('Unable to generate a puzzle. Try again.'); worker.terminate(); };
    let previousPieces = '';
    try { previousPieces = sessionStorage.getItem('octagram-last-pieces') ?? ''; } catch { /* Generation also works without storage. */ }
    worker.postMessage({ previousPieces, difficulty });
    return () => worker.terminate();
  }, [attempt, difficulty]);
  return <main className="page-shell"><header className="page-header"><div className="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 3h10l8 8v10l-8 8H11l-8-8V11Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="3" fill="currentColor" /></svg><h1>Octagram</h1></div><div className="toolbar-actions"><GameHelp />{settings}</div></header>
    {round ? <PuzzleGame puzzle={round} incorrectFeedback={incorrectFeedback} embedded onPlayAgain={() => { setRound(null); setAttempt(n => n + 1); }} />
      : error ? <div className="error-banner" role="alert">{error}<button type="button" className="text-button" onClick={() => setAttempt(n => n + 1)}>Try again</button></div>
      : <p className="game-status" role="status">Creating your puzzle…</p>}
  </main>;
}

export function PuzzleGame({ puzzle, onPlayAgain, embedded = false, incorrectFeedback = true }: { puzzle: ReturnType<typeof prepare>; onPlayAgain?: () => void; embedded?: boolean; incorrectFeedback?: boolean }) {
  const { board, graph } = puzzle;
  const [placement, setPlacement] = useState(() => emptyPlacement(graph));
  const [order, setOrder] = useState(() => shuffle(board.pieces));
  const [selected, setSelected] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [focusedRoute, setFocusedRoute] = useState<string | null>(null);
  const suppressClick = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const targetWords = useMemo(() => new Set(board.solutions.map(s => s.word)), [board]);
  const wordColors = detectWordColors(graph, placement, targetWords);
  const words = Object.keys(wordColors).sort();
  const solved = isSolved(graph, placement, words, targetWords);
  const highlightedWord = formedWord(graph.wordPaths?.find(route => route.id === focusedRoute)?.nodes ?? [], placement, targetWords);
  function highlightWord(word: string) {
    const route = graph.wordPaths?.find(route => formedWord(route.nodes, placement, targetWords) === word);
    setFocusedRoute(highlightedWord === word ? null : route?.id ?? null);
  }
  const bank = bankPieces(board.pieces, placement, order);

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
    setFocusedRoute(null);
  }

  return (
    <div className={embedded ? undefined : 'page-shell'} onKeyDown={event => { if (event.key === 'Escape') setFocusedRoute(null); }}>
      {!embedded && <header className="page-header"><div className="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 3h10l8 8v10l-8 8H11l-8-8V11Z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="16" cy="16" r="3" fill="currentColor" /></svg><h1>Octagram</h1></div><div className="toolbar-actions"><GameHelp /></div></header>}
      <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={event => { setActive(String(event.active.id)); setSelected(null); }} onDragEnd={dragEnd} onDragCancel={() => setActive(null)}>
        <div className="game-layout">
          <div className="game-sidebar">
          <PieceBank pieces={bank} selected={selected} onSelect={select} onReset={reset} onShuffle={() => setOrder(current => shuffleBank(board.pieces, placement, current))}
            canReturn={selected !== null && Object.values(placement).includes(selected)} onReturn={() => selected && !suppressClick.current && place(selected, 'bank')} />
          <WordsPanel words={words} total={targetWords.size} colors={wordColors} highlightedWord={highlightedWord} onHighlightWord={highlightWord} />
          </div>
          <OctagramBoard incorrectFeedback={incorrectFeedback} onReturn={piece => { if (!suppressClick.current) place(piece, 'bank'); }} onPlayAgain={onPlayAgain} focusedRoute={focusedRoute} onFocusRoute={setFocusedRoute} graph={graph} placement={placement} targetWords={targetWords} selected={selected} solved={solved} onSelect={select} onPlace={id => selected && !suppressClick.current && place(selected, id)} />
        </div>
        <DragOverlay dropAnimation={null}>{active && <span className="piece-tile overlay-tile">{active.toUpperCase()}</span>}</DragOverlay>
      </DndContext>
    </div>
  );
}
