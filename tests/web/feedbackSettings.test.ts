import { test, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { savedIncorrectFeedback } from '../../src/game/feedbackSettings';
import { savedDifficulty, maxPieceUses } from '../../src/game/difficulty';
import { GameSettings } from '../../src/components/GameSettings';

test('incorrect flashing defaults on and restores a disabled preference', () => {
  try {
    const getItem = vi.fn().mockReturnValue(null);
    vi.stubGlobal('localStorage', { getItem });
    expect(savedIncorrectFeedback()).toBe(true);
    getItem.mockReturnValue('false');
    expect(savedIncorrectFeedback()).toBe(false);
    getItem.mockImplementation(() => { throw new Error('Blocked'); });
    expect(savedIncorrectFeedback()).toBe(true);
  } finally { vi.unstubAllGlobals(); }
});
test('old expert preference migrates to the new hard complexity', () => {
  try {
    vi.stubGlobal('localStorage', { getItem: () => 'expert' });
    expect(savedDifficulty()).toBe('hard');
    expect(maxPieceUses(savedDifficulty())).toBe(6);
  } finally { vi.unstubAllGlobals(); }
});
test('incorrect feedback switch accurately shows enabled and disabled states', () => {
  for (const enabled of [false, true]) {
    const html = renderToStaticMarkup(createElement(GameSettings, { difficulty: 'easy', onChange: () => {}, incorrectFeedback: enabled }));
    const toggle = html.match(/<input[^>]*aria-label="Incorrect feedback"[^>]*>/)![0];
    expect(toggle.includes('checked=""')).toBe(enabled);
  }
});
