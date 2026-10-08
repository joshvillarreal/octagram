import { useDroppable } from '@dnd-kit/core';
import { nodePoint } from '../game/layout';
import { PieceTile } from './PieceTile';
import type { CSSProperties } from 'react';

interface Props { id: string; index: number; piece: string | null; selected: string | null; onSelect: (piece: string) => void; onPlace: (id: string) => void; routeColor?: string; onReturn?: (piece: string) => void; invalidFeedback?: number }
export function OctagramNode({ id, index, piece, selected, onSelect, onPlace, routeColor, onReturn, invalidFeedback }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const point = nodePoint(index);
  return (
    <div ref={setNodeRef} className={`octagram-node ${isOver ? 'over' : ''}${routeColor ? ' route-cell' : ''}`}
      style={{ left: `${point.x / 6}%`, top: `${point.y / 6}%`, '--route-color': routeColor, '--celebration-delay': `${index * 160}ms` } as CSSProperties}>
      {piece ? <PieceTile piece={piece} selected={piece === selected} invalidFeedback={invalidFeedback} onSelect={() => selected && selected !== piece ? onPlace(id) : onSelect(piece)} onReturn={onReturn ? () => onReturn(piece) : undefined} />
        : <button type="button" className="empty-slot" aria-label={`Empty position ${index + 1}${selected ? ', place selected piece' : ''}`} onClick={() => onPlace(id)} />}
    </div>
  );
}
