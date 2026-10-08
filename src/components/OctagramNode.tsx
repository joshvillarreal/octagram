import { useDroppable } from '@dnd-kit/core';
import { nodePoint } from '../game/layout';
import { PieceTile } from './PieceTile';

interface Props { id: string; index: number; piece: string | null; selected: string | null; onSelect: (piece: string) => void; onPlace: (id: string) => void }
export function OctagramNode({ id, index, piece, selected, onSelect, onPlace }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const point = nodePoint(index);
  return (
    <div ref={setNodeRef} className={`octagram-node ${isOver ? 'over' : ''}`}
      style={{ left: `${point.x / 6}%`, top: `${point.y / 6}%` }}>
      {piece ? <PieceTile piece={piece} selected={piece === selected} onSelect={() => selected && selected !== piece ? onPlace(id) : onSelect(piece)} />
        : <button type="button" className="empty-slot" aria-label={`Empty position ${index + 1}${selected ? ', place selected piece' : ''}`} onClick={() => onPlace(id)}><span aria-hidden="true">{index + 1}</span></button>}
    </div>
  );
}
