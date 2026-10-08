import { useEffect, useId, useRef, useState } from 'react';
import { DIFFICULTIES } from '../game/difficulty';
import type { Theme } from '../game/theme';
import type { Difficulty } from '../game/difficulty';

export function GameSettings({ difficulty, onChange, theme = 'light', onThemeChange, incorrectFeedback = true, onIncorrectFeedbackChange }: { difficulty: Difficulty; onChange: (difficulty: Difficulty) => void; theme?: Theme; onThemeChange?: (theme: Theme) => void; incorrectFeedback?: boolean; onIncorrectFeedbackChange?: (enabled: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [position, setPosition] = useState(() => DIFFICULTIES.findIndex(option => option.id === difficulty));
  useEffect(() => setPosition(DIFFICULTIES.findIndex(option => option.id === difficulty)), [difficulty]);
  function commit(value = position) { onChange(DIFFICULTIES[value].id); }
  const teeth = Array.from({ length: 32 }, (_, i) => {
    const angle = i * Math.PI / 16;
    const radius = i % 4 === 0 || i % 4 === 3 ? 10 : 8;
    return `${12 + radius * Math.cos(angle)},${12 + radius * Math.sin(angle)}`;
  }).join(' ');
  return <>
    <button type="button" className="help-button settings-button" aria-label="Game settings" title="Game settings" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points={teeth} /><circle cx="12" cy="12" r="3" /></svg>
    </button>
    <dialog ref={dialog} className="help-dialog settings-dialog" aria-labelledby={`${id}-title`} onClose={() => commit()}>
      <div className="help-heading"><h2 id={`${id}-title`}>Settings</h2><form method="dialog"><button type="submit" className="text-button" autoFocus>Close</button></form></div>
      <div className="difficulty-control">
        <label htmlFor={`${id}-difficulty`}>Complexity</label>
        <input id={`${id}-difficulty`} className="difficulty-slider" type="range" min="0" max="2" step="1" value={position}
          aria-valuetext={DIFFICULTIES[position].label} onChange={event => setPosition(Number(event.target.value))}
          onPointerUp={event => commit(Number(event.currentTarget.value))} onKeyUp={event => commit(Number(event.currentTarget.value))}
          onBlur={() => commit()} />
        <div className="difficulty-labels" aria-hidden="true">{DIFFICULTIES.map((option, index) => <span key={option.id} className={position === index ? 'current' : undefined}>{option.label}</span>)}</div>
      </div>
      <label className="theme-control"><span>Dark mode</span><input className="theme-switch" type="checkbox" role="switch" checked={theme === 'dark'} onChange={event => onThemeChange?.(event.target.checked ? 'dark' : 'light')} /></label>
      <label className="theme-control"><span>Incorrect feedback</span><input aria-label="Incorrect feedback" className="theme-switch" type="checkbox" role="switch" checked={incorrectFeedback} onChange={event => onIncorrectFeedbackChange?.(event.target.checked)} /></label>
    </dialog>
  </>;
}
