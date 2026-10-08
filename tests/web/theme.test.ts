import { test, expect, vi } from 'vitest';
import { savedTheme } from '../../src/game/theme';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameSettings } from '../../src/components/GameSettings';

test('dark mode is restored from storage and malformed preferences fall back to light', () => {
  try {
    const getItem = vi.fn().mockReturnValue('dark');
    vi.stubGlobal('localStorage', { getItem });
    expect(savedTheme()).toBe('dark');
    getItem.mockReturnValue('unknown');
    expect(savedTheme()).toBe('light');
    getItem.mockImplementation(() => { throw new Error('Storage blocked'); });
    expect(savedTheme()).toBe('light');
  } finally { vi.unstubAllGlobals(); }
});
test('dark mode is exposed as a labeled checked switch', () => {
  const html = renderToStaticMarkup(createElement(GameSettings, { difficulty: 'easy', onChange: () => {}, theme: 'dark', onThemeChange: () => {} }));
  expect(html).toContain('Dark mode');
  expect(html.match(/<input[^>]*role="switch"[^>]*>/)?.[0]).toContain('checked=""');
});
