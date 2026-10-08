import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { innerCircleRadius, SLOT_HEIGHT, VIEW_SIZE } from '../game/layout';
import type { Graph, Placement } from '../types/game';
import { buildWordArrows, presentWordArrows } from '../game/wordArrows';
import { OctagramNode } from './OctagramNode';

interface Props { graph: Graph; placement: Placement; targetWords: Set<string>; selected: string | null; solved: boolean; onSelect: (piece: string) => void; onPlace: (id: string) => void }
export function OctagramBoard({ graph, placement, targetWords, selected, solved, onSelect, onPlace }: Props) {
  const markerId = `arrow-${useId().replace(/:/g, '')}`;
  const boardRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(() => innerCircleRadius());
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
  const presented = presentWordArrows(arrows, graph, placement, targetWords);
  return (
    <section className={`board-region ${solved ? 'solved' : ''}`} aria-label="Octagram puzzle board">
      <div ref={boardRef} className="octagram-board">
        <svg className="graph-arrows" viewBox="0 0 600 600" aria-hidden="true">
          <defs>{presented.map(arrow => <marker key={arrow.id} id={`${markerId}-${arrow.id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={arrow.displayColor} /></marker>)}</defs>
          {presented.map(arrow => <g key={arrow.id} className={`word-arrow${arrow.completed ? ' completed' : ''}`} data-route-id={arrow.id}>
            <path className="arrow-body" d={arrow.bodyPath} fill={arrow.displayColor} stroke="var(--board-background)" strokeWidth="3" strokeLinejoin="round" paintOrder="stroke fill" />
            <path d={arrow.path} stroke="none" fill="none" markerEnd={`url(#${markerId}-${arrow.id})`} />
          </g>)}
        </svg>
        {graph.nodes.map((id, index) => <OctagramNode key={id} id={id} index={index} piece={placement[id]} selected={selected} onSelect={onSelect} onPlace={onPlace} />)}
      </div>
      <p className="board-caption">Follow one colored arrow through three pieces to make a word.</p>
    </section>
  );
}
