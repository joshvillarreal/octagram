import { useDroppable } from '@dnd-kit/core';
import { PieceTile } from './PieceTile';

interface Props { pieces: string[]; selected: string | null; onSelect: (piece: string) => void; onReturn: () => void; onShuffle: () => void }
export function PieceBank({ pieces, selected, onSelect, onReturn, onShuffle }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bank' });
  return (
    <section ref={setNodeRef} className={`piece-bank ${isOver ? 'over' : ''}`} aria-labelledby="pieces-heading">
      <div className="section-heading"><h2 id="pieces-heading">Pieces</h2><span className="small-count">{pieces.length} remaining</span></div>
      <div className="bank-tiles">{pieces.map(piece => <PieceTile key={piece} piece={piece} selected={selected === piece} onSelect={() => onSelect(piece)} />)}</div>
      <p className="quiet">Drag pieces onto the board, or select a piece and then a position.</p>
      <div className="bank-controls"><button type="button" className="text-button" onClick={onShuffle} disabled={pieces.length < 2}>Shuffle bank</button><button type="button" className="text-button" onClick={onReturn} disabled={!selected}>Return selected piece</button></div>
    </section>
  );
}
