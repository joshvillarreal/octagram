import { useDroppable } from '@dnd-kit/core';
import { PieceTile } from './PieceTile';

interface Props { pieces: string[]; selected: string | null; onSelect: (piece: string) => void; onReset: () => void; onShuffle: () => void; canReturn: boolean; onReturn: () => void }
export function PieceBank({ pieces, selected, onSelect, onReset, onShuffle, canReturn, onReturn }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bank' });
  return (
    <section ref={setNodeRef} className={`piece-bank ${isOver ? 'over' : ''}${canReturn ? ' return-ready' : ''}`} aria-labelledby="pieces-heading"
      tabIndex={canReturn ? 0 : undefined} aria-description={canReturn ? 'Click here, or press Enter or Space, to return the selected piece.' : undefined}
      onClick={event => { if (canReturn && event.target instanceof Element && !event.target.closest('button, input, label')) onReturn(); }}
      onKeyDown={event => { if (canReturn && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onReturn(); } }}>
      <div className="section-heading"><h2 id="pieces-heading">Pieces</h2><span className="small-count">{pieces.length} remaining</span></div>
      <div className="bank-tiles">{pieces.map(piece => <PieceTile key={piece} piece={piece} selected={selected === piece} onSelect={() => onSelect(piece)} />)}</div>
      <div className="bank-controls"><button type="button" className="text-button" onClick={onShuffle} disabled={pieces.length < 2}>Shuffle bank</button><button type="button" className="text-button" onClick={onReset}>Reset</button></div>
    </section>
  );
}
