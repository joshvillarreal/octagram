import dictionary from '../data/americanDictionary.json';
import { isDifficulty, maxPieceUses } from './difficulty';
import { createRandomBoardSearch } from './randomBoard';

self.onmessage = event => {
  try {
    const difficulty = isDifficulty(event.data.difficulty) ? event.data.difficulty : 'easy';
    const search = createRandomBoardSearch(dictionary, Math.random, maxPieceUses(difficulty));
    for (let batch = 0; batch < 12; batch++) {
      const board = search(15000, event.data.previousPieces ?? '');
      if (board) { self.postMessage({ board }); return; }
    }
    self.postMessage({ error: 'No valid board found. Try again to start another search.' });
  } catch {
    self.postMessage({ error: 'Unable to generate a puzzle. Try again.' });
  }
};
