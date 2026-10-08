import { useDraggable } from '@dnd-kit/core';

interface Props { piece: string; selected: boolean; onSelect: () => void; onReturn?: () => void; invalidFeedback?: number }
export function PieceTile({ piece, selected, onSelect, onReturn, invalidFeedback }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: piece });
  return (
    <button ref={setNodeRef} {...attributes} {...listeners}
      className={`piece-tile ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      aria-label={`Piece ${piece.toUpperCase()}`} aria-pressed={selected}
      onClick={event => { if (event.detail < 2) onSelect(); }} onDoubleClick={onReturn} type="button">
      {piece.toUpperCase()}
      {invalidFeedback !== undefined && <span key={invalidFeedback} className="tile-invalid-flash" aria-hidden="true">{piece.toUpperCase()}</span>}
    </button>
  );
}
