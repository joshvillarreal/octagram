import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import App, { PuzzleGame } from '../../src/App';
import musician from '../../src/data/musicianBoard.json';
const puzzle = { board: parseBoard(musician), graph: buildGraph(parseBoard(musician)) }; 
import fixture from '../../src/data/exampleBoard.json';
import { parseBoard } from '../../src/game/boardParser';
import { buildGraph } from '../../src/game/graph';
import { emptyPlacement } from '../../src/game/gameState';
import { OctagramBoard } from '../../src/components/OctagramBoard';
import { WordsPanel } from '../../src/components/WordsPanel';

test('opens with eight empty positions, eight pieces, and no disclosed solutions', () => {
  const html = renderToStaticMarkup(createElement(PuzzleGame, { puzzle }));
  expect(html.match(/class="empty-slot"/g)).toHaveLength(8);
  expect(html.match(/aria-label="Piece /g)).toHaveLength(8);
  expect(html).toContain('graph-arrows');
  expect(html).not.toContain('HEADER');
  expect(html).not.toContain('THIMBLE');
  expect(html).not.toContain('MUSICIAN');
  expect(html).toContain('aria-label="Piece MUS"');
  expect(html).toContain('aria-label="Piece MAG"');
  expect(html).toContain('0<span> / 9');
});

test('the words panel contains only currently formed words, with no placeholders', () => {
  const html = renderToStaticMarkup(createElement(WordsPanel, { words: ['header'], total: 9 }));
  expect(html).toContain('HEADER');
  expect(html).not.toContain('HEADING');
  expect(html.match(/<li/g)).toHaveLength(1);
  const empty = renderToStaticMarkup(createElement(WordsPanel, { words: [], total: 9 }));
  expect(empty).not.toContain('<li');
});

test('renders nine continuous tapered arrows without leaking target word labels', () => {
  const html = renderToStaticMarkup(createElement(PuzzleGame, { puzzle }));
  expect(html.match(/class="arrow-body"/g)).toHaveLength(9);
  expect(html).not.toContain('route-header');
  expect(html).toContain('aria-label="How to play"');
  expect(html).toContain('<dialog');
  expect(html).not.toContain('class="board-caption"');
  expect(html.match(/class="arrow-hit-area"/g)).toHaveLength(9);
  expect(html).not.toContain('clipPath=');
  expect(html.match(/aria-pressed="false" aria-label="Highlight route/g)).toHaveLength(9);
});

test('formed word colors are displayed beside the word', () => {
  const html = renderToStaticMarkup(createElement(WordsPanel, { words: ['header'], total: 9, colors: { header: ['#a34d36'] }, highlightedWord: 'header' }));
  expect(html).toContain('background-color:#a34d36');
  expect(html).toContain('HEADER');
  expect(html).toContain('aria-pressed="true" aria-label="Highlight HEADER"');
});

test('renders one arrowhead at the suffix and no intermediate arrowhead', () => {
  const html = renderToStaticMarkup(createElement(PuzzleGame, { puzzle }));
  expect(html.match(/marker-end=/g)).toHaveLength(9);
  expect(html).not.toContain('marker-mid=');
  expect(html).not.toContain('marker-start=');
});


test('completed arrow body and tip are gray and painted before colored arrows', () => {
  const board = parseBoard({ ...fixture, layout: fixture.pieces });
  const graph = buildGraph(board);
  const node = (piece: string) => graph.nodes[board.pieces.indexOf(piece)];
  const placement = { ...emptyPlacement(graph), [node('he')]: 'he', [node('al')]: 'ad', [node('th')]: 'er' };
  const html = renderToStaticMarkup(createElement(OctagramBoard, {
    graph, placement, targetWords: new Set(board.solutions.map(s => s.word)),
    selected: null, solved: false, onSelect: () => {}, onPlace: () => {},
  }));
  expect(html.match(/fill="#c7ccc5"/g)).toHaveLength(2);
  expect(html.indexOf('class="word-arrow completed"')).toBeLessThan(html.indexOf('class="word-arrow"'));
});

test('refresh starts generation and offers no puzzle upload', () => {
  const html = renderToStaticMarkup(createElement(App));
  expect(html).toContain('Creating your puzzle');
  expect(html).not.toContain('type="file"');
  expect(html).not.toContain('Load puzzle');
});
