import { useId, useRef } from 'react';

export function GameHelp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return <>
    <button type="button" className="help-button" aria-label="How to play" title="How to play" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>i</button>
    <dialog ref={dialog} className="help-dialog" aria-labelledby={titleId}>
      <div className="help-heading"><h2 id={titleId}>How to play</h2><form method="dialog"><button type="submit" className="text-button" autoFocus>Close</button></form></div>
      <p>Arrange all eight pieces so that, in <strong>one final arrangement, every arrow route spells a valid word</strong>.</p>
      <ol>
        <li><strong>Place the pieces.</strong> Drag a piece onto a position, or select a piece and then select a position. Dropping onto an occupied position swaps the two pieces.</li>
        <li><strong>Follow the arrows.</strong> Each word follows a route through three positions: start at the <strong>thick end</strong> of an arrow, pass through the middle position, and continue to the <strong>thin tip</strong>. Join those three pieces, in order, to spell a word.</li>
        <li><strong>Solve the whole board.</strong> Each placement may complete some word routes while disrupting others. The puzzle is solved only when <strong>every route on the board spells a valid word in the same arrangement</strong>. Correct words appear in the <strong>Words</strong> panel.</li>
        <li><strong>Use the arrows as feedback.</strong> When a route spells a correct word, its arrow turns light gray and fades into the background. If three filled positions along a route spell an invalid word, that route and its pieces briefly pulse dark.</li>
        <li><strong>Inspect a route.</strong> Click or tap an arrow or a completed word to highlight its three positions. Select it again, click elsewhere, or press <strong>Escape</strong> to clear the highlight.</li>
      </ol>
      <p>To remove a piece, drag it back to the Pieces bank or double-click it. <strong>Shuffle bank</strong> rearranges unused pieces. <strong>Reset</strong> clears the board. Refresh the page for a new puzzle.</p>
      <p>Keyboard users can navigate with <strong>Tab</strong> and select pieces, positions, arrows, words, or the bank with <strong>Enter</strong> or <strong>Space</strong>.</p>
    </dialog>
  </>;
}
