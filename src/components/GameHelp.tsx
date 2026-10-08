import { useId, useRef } from 'react';

export function GameHelp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className="help-button" aria-label="How to play" title="How to play" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>i</button>
    <dialog ref={dialog} className="help-dialog" aria-labelledby={titleId}>
      <div className="help-heading"><h2 id={titleId}>How to play</h2><form method="dialog"><button type="submit" className="text-button" autoFocus>Close</button></form></div>
      <p>Arrange all eight pieces to form every word at the same time.</p>
      <ol>
        <li>Drag a piece onto a position, or click/tap a piece and then a position. With a keyboard, use Tab and Enter or Space.</li>
        <li>Follow one colored arrow from its thick start, through the middle position, to its thin tip. Join those three pieces to spell a word.</li>
        <li>Correct words appear in the Words panel, and their arrows turn light gray. Moving a piece can undo a word.</li>
        <li>Click or tap an arrow or a completed word to bring its route forward and highlight its three positions. Click it again, click elsewhere, or press Escape to clear it. Keyboard users can Tab to an arrow or word and press Enter or Space.</li>
      </ol>
      <p>Placing a piece on an occupied position swaps pieces. To remove a placed piece, double-click it, select it and click an empty area of the Pieces bank, or drag it back. Keyboard users can select a placed piece, Tab to the bank, and press Enter or Space.</p>
      <p><strong>Shuffle bank</strong> reorders unused pieces. <strong>Reset</strong> clears the board. Refresh the page for a newly generated puzzle.</p>
    </dialog>
  </>;
}
