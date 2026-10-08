# Octagram

A browser word puzzle and a separate Python board generator. Arrange eight letter
pieces on an anonymous directed graph until all target words exist at once.
`HEADER = HE → AD → ER`: one colored arrow sweeps through all three positions, and the
three occupied positions spell the word. Moving a piece can remove a word again.

## Play locally

Install Node.js 20.19+ (Node 22 LTS is also suitable), then run from this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. Each refresh generates a new board, opening with eight empty positions and a shuffled piece bank. Use the ⓘ button for instructions.
Drag with a mouse or touch, or click/tap a piece and then a destination. Keyboard
users can use Tab and Enter/Space for the same select-and-place interaction.
Dropping onto an occupied position swaps board pieces; a displaced bank piece
returns to the bank. Drop on the bank to remove it, or select a placed piece and
click an empty area of the Pieces bank. Keyboard users can Tab to the bank and
press Enter or Space after selecting a placed piece.
**Reset** clears the arrangement; **Shuffle bank** only reorders unplaced pieces.

The Words panel shows only words formed by the current arrangement, alphabetically.
Win by placing all eight pieces and forming all supplied words simultaneously.
Any labeling that achieves that target wins, even if it differs from the hidden layout.

## Web development

```sh
npm run test       # Vitest engine and presentation tests
npm run lint       # Strict TypeScript checking
npm run build      # Type checking and Vite production build in dist/
npm run preview    # Serve the production build locally
```

`src/game/` contains parsing, validation, layout, graph, placement, and word
recognition. `src/components/` contains React presentation and drag/drop bindings.
The browser worker uses `src/data/americanDictionary.json`: 12,814 American
English words of length 6–9 with wordfreq Zipf scores of at least 3. It chooses
random constructible seeds, searches candidates, and exhaustively validates all
336 ordered triples before ranking valid boards. Rules match the Python generator:
eight unique 2–3-letter pieces, three distinct pieces per word, all accidental
words included, no ambiguous constructions or morphological duplicates, and at
least seven pieces used in two or more words, with every piece used at most three times. Scoring favors common words and
three or four uses per piece. Morphological checks retain the Python suffix
heuristic's limitations.

Search runs off the main thread in batches of 15,000 attempts, retrying up to
12 batches before offering **Try again**. No fixed puzzle fallback is used.
Session storage excludes the previous board on refresh when storage is available.
Reset clears the current arrangement without generating another board.

Rebuild the dictionary with `python scripts/export-browser-dictionary.py` after
installing the Python dependencies. The browser needs no backend or Python.
Dictionary attribution and licensing are in `public/dictionary-NOTICE.txt`.
The former musician and example boards remain as test fixtures.

## Website releases and hosting

The game is a static website: visitors need only a browser. The dictionary is bundled with the generation worker; no backend or API key is needed for gameplay.

```sh
npm ci
npm run release
```

This runs the web tests, builds `dist/`, and creates
`releases/octagram-site.tar.gz`. The archive contains only the production files
and `.openai/hosting.json`; it excludes source code and local configuration.
`npm run preview` lets you check the production build locally.

`.openai/hosting.json` registers this project with Sites and declares `dist/` as
the static directory. Keep its project ID when publishing updates. Sites releases
must push the matching source commit, save a version using the release archive,
and deploy that saved version. Access settings control who can open the link.

The GitHub Actions workflow in `.github/workflows/web.yml` runs `npm ci` and
`npm run release` on pushes and pull requests, then uploads the deployment bundle
as the `octagram-site` artifact. It checks and packages changes; publication is
performed separately through Sites. Other static hosts can serve the contents
of `dist/` directly at the domain root.

## Share the game with GitHub Pages

In the repository's **Settings → Pages**, choose **GitHub Actions** as the
publishing source. Push changes to `main`; `.github/workflows/jekyll-gh-pages.yml` tests and
builds the game, then deploys `dist/`. Pull requests run checks without publishing.
You can also run the workflow manually from the Actions tab.

For `joshvillarreal/octagram`, the expected address is
`https://joshvillarreal.github.io/octagram/`. Wait for the Pages deployment to
succeed before sharing it. Relative asset URLs allow the game to run under this
repository path as well as a domain root.

The website is publicly accessible. Its robots file and `noindex` metadata ask
search engines not to list it, but do not restrict access or guarantee secrecy.
Friends need only the link and a browser; no GitHub account is required for a
public Pages site. Repository visibility and plan must support GitHub Pages.

## Puzzle JSON

A normalized board uses eight unique pieces and a nonempty solution list:

```ts
interface BoardInput {
  pieces: string[];
  solutions: { word: string; pieces: [string, string, string]; frequency?: number }[];
  score?: number;
  layout?: string[]; // Optional piece order, clockwise from the top node
}
```

See the complete example in `src/data/exampleBoard.json`. The parser also accepts
legacy JSON containing `usage` and `word_frequencies`, and full Python results
containing `board.pieces` and `solutions[].constructions`. For a generator result
array, the first board is loaded. An empty array is an error.

The JSON formats remain supported by developer tools and fixtures; the game no longer offers file uploads.

Every solution is decomposed by checking ordered triples of distinct pieces. All
valid constructions are retained internally. Each contributes first → second and
second → third edges. Each word has a distinct color and each construction is rendered as one continuous
swooping arrow, with a single arrowhead at the suffix. Each arrow tapers smoothly from a thick
start to a thin tip, helping communicate reading direction. Shared connections use separate curved lanes; small
background gaps keep incidental crossings legible. Formed words show color markers
matching their current paths. Multiple constructions of one word share a color.
When an arrow currently forms any target word, its body and tip turn light gray
and move behind unfinished arrows. This applies even when it forms a different
target word from its original construction. Breaking the word immediately restores
the original color and layer order; word-panel markers retain the route’s color.
The hidden layout deterministically minimizes weighted chord crossings and lengths,
unless an explicit layout is supplied. The rendered graph uses anonymous node IDs.
Arrows start near the prefix, sweep just inside the middle box, and end near the
suffix. The two cubic sections join with matching tangents near the middle piece,
with no intermediate arrowhead. The entire swoop remains in the inner circle and
clear of all boxes. A filled ribbon tapers by distance along the whole curve,
without restarting its width at the middle. Routing adapts to larger minimum-height
boxes on narrow screens.

Gameplay examines three distinct occupied nodes along a complete colored route,
concatenates their pieces, and checks membership in the supplied target set. A
mixed-color path does not count, nor does a route spelling a word outside the target set. Multiple paths forming
the same target word display it only once.

## Python board generator

A Python 3.11+ toolkit for generating and validating eight-piece word boards.
Every solution joins exactly three distinct, atomic pieces in any order. Validation
exhaustively checks all 336 ordered triples, retains accidental words, requires two- or three-letter pieces, and requires seven pieces to occur in two or more words, and rejects any piece appearing in more than three solution words.
Every dictionary-valid word must have exactly one construction on the board.
For example, a board containing `con`, `cre`, `te`, `cr`, and `ete` is rejected
because both `con + cre + te` and `con + cr + ete` form `concrete`.
This rule applies to accidental words as well as the seed. Evaluation reports
all constructions of an ambiguous word and rejects the whole board.

## Development

```sh
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
ruff check .
ruff format --check .
```

## Commands

```sh
python -m octagram splits commuter
python -m octagram find commuter --num-results 10 --random-seed 0
python -m octagram find commuter --min-zipf 3.5 --attempts 100000
python -m octagram evaluate com mut er ing ed re un st
```

Commands emit JSON, including board scores and solution frequencies. By default,
the dictionary is built automatically from the English `large` list bundled with
[wordfreq](https://github.com/rspeer/wordfreq); no dictionary file or runtime download
is needed after installation. Only ASCII alphabetic words of length 6–9 accepted
by the American English (`en_US`) SCOWL dictionary bundled with
[Spylls](https://spylls.readthedocs.io/en/latest/hunspell/dictionary.html) are retained.
This excludes spellings such as `centre`, `colour`, and `theatre`, including their
inflected forms. American entries retain their own wordfreq scores; British variant
frequencies are not transferred to them. Spelling checks use Hunspell affix rules,
so regular plurals and conjugations are supported.
`--min-zipf` sets the membership cutoff (default 3.0, approximately one occurrence
per million words). Lower it to include rarer words. The cutoff applies to
dictionary words and accidental solutions. The corpus also contains names, abbreviations,
and slang; American dictionary membership and frequency do not guarantee suitability
for every word game.

The word supplied to `find` is always allowed as a solution, even when it is absent
from the dictionary or excluded by the spelling/frequency filters. Only this exact
seed is exempt; every other solution must belong to the selected dictionary.
The seed still needs exactly three distinct two- or three-letter pieces, exactly
one construction, and must satisfy the morphological-duplicate rule. It counts
toward piece usage. Missing frequency metadata contributes zero commonality credit.
Use `evaluate ... --seed YOURWORD` to apply the same exception when evaluating.

Ranking favors each piece appearing in **three or four distinct solution words**.
The usage score is `2 * sum(1 / (1 + distance))`, where distance is the number of
uses below three or above four (zero within the target). Both underused and
overused pieces receive less credit. The three-to-four target is a ranking
preference; validation requires seven pieces used at least twice and caps every piece at three uses. Thus three is the highest-scoring valid usage.

The total also includes `0.25 * min(solution_count, 10)` and a commonality bonus of
`0.25 * mean(log10(1 + frequency))`, with frequency in occurrences per billion words.
Solution-count credit stops at ten; average commonality favors familiar words
without rewarding extra words just for increasing their total frequency.
Missing frequency metadata contributes zero. Scoring never hides solutions or
changes validation rules within the selected dictionary.

You can still override the default with `--dictionary words.txt`: one ASCII word per
line, optionally followed by a nonnegative frequency (occurrences per billion) and a
morphological family, such as `played 150 play`. Blank lines and `#` comments are
supported. `--dictionary` and `--min-zipf` are mutually exclusive.
An explicit dictionary file defines its own membership and bypasses the automatic
American English filter; use American spellings in such curated files. Synthetic
dictionaries created with `Dictionary.from_words` also remain available for tests.

Search grows boards by adding pieces that complete words with two existing pieces,
favoring extensions supported by several pairs. It also samples some boards from
the full piece pool to explore disconnected word groups. Every complete candidate
passes through exhaustive validation before acceptance.
`--attempts` bounds the work (default 10,000). A fixed dictionary and random seed
produce identical results (with the same wordfreq version and cutoff). An empty result means no valid board was found within
the attempt budget; it does not establish that none exists.

Morphological rejection uses explicit family metadata when both words have it,
otherwise common suffix heuristics (including `commute`/`commuter` and
`play`/`played`). These heuristics are not a complete English morphological analyzer
and can produce false positives. Curate family metadata for production word lists;
distinct explicit families override the suffix heuristics. Rejected boards still
report every constructible dictionary word.

Modules keep dictionary loading, segmentation, canonical validation, bounded search,
and quality scoring separate. Tests use synthetic dictionaries and require no
external data or network access.
