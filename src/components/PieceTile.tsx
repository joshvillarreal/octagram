import { useDraggable } from '@dnd-kit/core';

interface Props { piece: string; selected: boolean; onSelect: () => void }
export function PieceTile({ piece, selected, onSelect }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: piece });
  return (
    <button ref={setNodeRef} {...attributes} {...listeners}
      className={`piece-tile ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      aria-label={`Piece ${piece.toUpperCase()}`} aria-pressed={selected}
      onClick={onSelect} type="button">
      {piece.toUpperCase()}
    </button>
  );
}
