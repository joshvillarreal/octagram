import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { innerCircleRadius, SLOT_HEIGHT, VIEW_SIZE } from '../game/layout';
import type { Graph, Placement } from '../types/game';
import { buildWordArrows, presentWordArrows } from '../game/wordArrows';
import { CompletionBanner } from './CompletionBanner';
import { OctagramNode } from './OctagramNode';
import { invalidRouteChanges } from '../game/wordDetection';

interface Props { graph: Graph; placement: Placement; targetWords: Set<string>; selected: string | null; solved: boolean; onSelect: (piece: string) => void; onPlace: (id: string) => void; focusedRoute?: string | null; onFocusRoute?: (id: string | null) => void; onPlayAgain?: () => void; onReturn?: (piece: string) => void; incorrectFeedback?: boolean }
export function OctagramBoard({ graph, placement, targetWords, selected, solved, onSelect, onPlace, focusedRoute: externalFocus, onFocusRoute, onPlayAgain, onReturn, incorrectFeedback = true }: Props) {
  const markerId = `arrow-${useId().replace(/:/g, '')}`;
  const boardRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(() => innerCircleRadius());
  const [localFocus, setLocalFocus] = useState<string | null>(null);
  const previousPlacement = useRef(placement);
  const feedbackSequence = useRef(0);
  const [feedbackState, setFeedback] = useState<{ ids: string[]; sequence: number } | null>(null);
  const feedback = incorrectFeedback ? feedbackState : null;
  useEffect(() => {
    const ids = incorrectFeedback ? invalidRouteChanges(graph, previousPlacement.current, placement, targetWords) : [];
    previousPlacement.current = placement;
    if (!ids.length) { setFeedback(null); return; }
    setFeedback({ ids, sequence: ++feedbackSequence.current });
    const timer = window.setTimeout(() => setFeedback(null), 800);
    return () => window.clearTimeout(timer);
  }, [graph, placement, targetWords, incorrectFeedback]);
  const focusedRoute = externalFocus === undefined ? localFocus : externalFocus;
  const setFocusedRoute = onFocusRoute ?? setLocalFocus;
  useEffect(() => {
    function clearOutsideArrow(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('.word-route-button')) return;
      if (!(target instanceof Element) || !boardRef.current?.contains(target) || !target.closest('.word-arrow')) setFocusedRoute(null);
    }
    document.addEventListener('click', clearOutsideArrow);
    return () => document.removeEventListener('click', clearOutsideArrow);
  }, [setFocusedRoute]);
  useEffect(() => {
    const element = boardRef.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      if (width > 0) setRadius(innerCircleRadius(Math.max(SLOT_HEIGHT, 44 * VIEW_SIZE / width)));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const arrows = useMemo(() => buildWordArrows(graph, radius), [graph, radius]);
  const focused = (graph.wordPaths ?? []).find(route => route.id === focusedRoute);
  const presented = presentWordArrows(arrows, graph, placement, targetWords, focused?.id);
  const invalidNodes = new Set((graph.wordPaths ?? []).filter(route => feedback?.ids.includes(route.id)).flatMap(route => route.nodes));
  function toggleRoute(id: string) { setFocusedRoute(focusedRoute === id ? null : id); }
  return (
    <section className={`board-region ${solved ? 'solved' : ''}`} aria-label="Octagram puzzle board">
      <div ref={boardRef} className={`octagram-board${focused ? ' has-focused-route' : ''}`} onKeyDown={event => { if (event.key === 'Escape') setFocusedRoute(null); }}>
        <svg className="graph-arrows" viewBox="0 0 600 600" aria-label="Word routes" onClick={event => { if (event.target === event.currentTarget) setFocusedRoute(null); }}>
          <defs>{presented.map(arrow => <marker key={`${arrow.id}-${feedback?.ids.includes(arrow.id) ? feedback.sequence : 0}`} style={{ '--arrow-color': arrow.id === focused?.id ? arrow.color : arrow.displayColor } as CSSProperties} id={`${markerId}-${arrow.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse" overflow="visible"><path d="M 0 3 L 0 0 L 10 5 L 0 10 L 0 7" fill="none" stroke="var(--board-background)" strokeWidth={3 * 10 / 7} strokeLinejoin="round" /><path className={feedback?.ids.includes(arrow.id) ? 'invalid-flash' : undefined} d="M 0 0 L 10 5 L 0 10 z" fill={arrow.id === focused?.id ? arrow.color : arrow.displayColor} /></marker>)}</defs>
          {presented.map(arrow => <g key={arrow.id} className={`word-arrow${arrow.completed ? ' completed' : ''}${arrow.id === focused?.id ? ' focused-route' : ''}`} data-route-id={arrow.id} style={{ '--arrow-color': arrow.id === focused?.id ? arrow.color : arrow.displayColor } as CSSProperties}
            role="button" tabIndex={0} aria-pressed={arrow.id === focused?.id}
            aria-label={`Highlight route through positions ${(graph.wordPaths?.find(route => route.id === arrow.id)?.nodes ?? []).map(node => graph.nodes.indexOf(node) + 1).join(', ')}`}
            onClick={event => { toggleRoute(arrow.id); event.currentTarget.blur(); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleRoute(arrow.id); } }}>
            <path key={`body-${feedback?.ids.includes(arrow.id) ? feedback.sequence : 0}`} className={`arrow-body${feedback?.ids.includes(arrow.id) ? ' invalid-flash' : ''}`} d={arrow.bodyPath} fill={arrow.id === focused?.id ? arrow.color : arrow.displayColor} stroke="var(--board-background)" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke fill" />
            <path d={arrow.path} stroke="none" fill="none" markerEnd={`url(#${markerId}-${arrow.id})`} />
            <path className="arrow-hit-area" d={arrow.path} fill="none" stroke="transparent" strokeWidth="18" />
          </g>)}
        </svg>
        {graph.nodes.map((id, index) => <OctagramNode key={id} id={id} index={index} piece={placement[id]} selected={selected} onSelect={onSelect} onPlace={onPlace} onReturn={onReturn}
          invalidFeedback={invalidNodes.has(id) ? feedback?.sequence : undefined} routeColor={focused?.nodes.includes(id) ? focused.color : undefined} />)}
        <span className="sr-only" role="status" aria-atomic="true">{feedback ? `${feedback.ids.length === 1 ? 'A completed route does' : 'Some completed routes do'} not form a valid word.` : ''}</span>
        {solved && <div className="completion-overlay"><CompletionBanner onPlayAgain={onPlayAgain} /></div>}
      </div>
    </section>
  );
}
