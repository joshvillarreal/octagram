import { test, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { GameSettings } from '../../src/components/GameSettings';
import { maxPieceUses, isDifficulty, savedDifficulty } from '../../src/game/difficulty';

test('difficulty levels map to the requested inclusive usage caps', () => {
  expect(['easy', 'medium', 'hard'].map(value => isDifficulty(value) ? maxPieceUses(value) : null)).toEqual([3, 4, 6]);
  expect(isDifficulty('impossible')).toBe(false);
  expect(savedDifficulty()).toBe('easy');
});
test('settings offer accessible choices and select the current difficulty', () => {
  const html = renderToStaticMarkup(createElement(GameSettings, { difficulty: 'hard', onChange: () => {} }));
  expect(html).toContain('aria-label="Game settings"');
  expect(html).toContain('type="range"');
  expect(html).toContain('min="0" max="2" step="1"');
  expect(html).toContain('aria-valuetext="Hard"');
  expect(html).toContain('value="2"');
  expect(html).toContain('role="switch"');
  expect(html).not.toContain('At most');
  expect(html).not.toContain('<p>');
  expect(html).toContain('Complexity');
  expect(html).not.toContain('>Difficulty<');
  expect(html).not.toContain('Expert');
});
