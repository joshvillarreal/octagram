# Octagram Web Game

## Objective

Build the first playable browser version of **Octagram**.

The previous Octagram work generates valid game boards. This task is different: given one already-generated board, build the interactive web game that allows a player to solve it.

Do **not** implement board generation in the browser.

The browser app receives a valid game-board definition, converts it into an anonymous directed graph, displays that graph as eight empty positions arranged around an octagon, and lets the user drag the eight word pieces into those positions.

As the player moves pieces around, the app should continuously determine which solution words are currently represented by the arrangement.

---

# 1. Core Game Concept

An Octagram board contains:

- exactly 8 word pieces;
- a collection of solution words;
- each solution word consists of exactly 3 pieces in a particular order.

Example board:

```json
{
  "usage": {
    "ad": 4,
    "al": 4,
    "er": 3,
    "he": 5,
    "imb": 1,
    "ing": 3,
    "le": 4,
    "th": 3
  },
  "errors": [],
  "valid": true,
  "score": 16.89334377096801,
  "word_frequencies": {
    "header": 7585.775750291836,
    "heading": 30199.51720402019,
    "healer": 2089.296130854039,
    "healing": 16982.43652461746,
    "health": 275422.8703338169,
    "leader": 89125.0938133746,
    "leading": 100000.0,
    "lethal": 7244.359600749898,
    "thimble": 0
  }
}
```

The pieces are therefore:

```text
AD
AL
ER
HE
IMB
ING
LE
TH
```

The solution words decompose as:

```text
HEADER  = HE + AD + ER
HEADING = HE + AD + ING
HEALER  = HE + AL + ER
HEALING = HE + AL + ING
HEALTH  = HE + AL + TH
LEADER  = LE + AD + ER
LEADING = LE + AD + ING
LETHAL  = LE + TH + AL
THIMBLE = TH + IMB + LE
```

These decompositions can be derived programmatically from the eight pieces and the solution words.

---

# 2. Fundamental Puzzle Model

Treat the board as a **directed weighted graph with 8 anonymous nodes**.

The nodes correspond to the eight octagonal positions.

The pieces are labels that the player assigns to those nodes.

Each solution word contributes two directed edges.

For:

```text
HEADER = HE + AD + ER
```

add:

```text
HE → AD
AD → ER
```

For:

```text
HEADING = HE + AD + ING
```

add:

```text
HE → AD
AD → ING
```

Because `HE → AD` appears in both words, that edge has weight 2.

Thus:

```text
edge weight =
number of solution-word constructions using that directed adjacency
```

The graph should be built from **all solution words**.

This graph is then rendered without showing which piece belongs at which node.

That anonymous graph is the puzzle.

---

# 3. Expected Graph for the Example Board

For the example above, the directed edge weights should include:

```text
HE  → AD   2
AD  → ER   2
AD  → ING  2

HE  → AL   3
AL  → ER   1
AL  → ING  1
AL  → TH   1

LE  → AD   2
LE  → TH   1

TH  → AL   1
TH  → IMB  1
IMB → LE   1
```

Write tests confirming that these weights are derived correctly.

---

# 4. Board Input

Create a clean internal board format.

Prefer eventually receiving board data in this form:

```ts
interface OctagramBoard {
  pieces: string[];

  solutions: {
    word: string;
    pieces: [string, string, string];
    frequency?: number;
  }[];

  score?: number;
}
```

For example:

```json
{
  "pieces": [
    "ad",
    "al",
    "er",
    "he",
    "imb",
    "ing",
    "le",
    "th"
  ],
  "solutions": [
    {
      "word": "header",
      "pieces": ["he", "ad", "er"]
    },
    {
      "word": "heading",
      "pieces": ["he", "ad", "ing"]
    }
  ]
}
```

However, the app must also support the current Python-generator output shown above.

For legacy board data:

- use the keys of `usage` as the eight pieces;
- use the keys of `word_frequencies` as the solution words;
- derive each word's 3-piece decomposition automatically.

To derive a construction, enumerate ordered triples of distinct pieces and find those whose concatenation equals the word.

Example:

```text
"header"

"he" + "ad" + "er" = "header"
```

If a solution has no possible construction, treat the board data as invalid.

If multiple valid constructions exist, retain all valid constructions internally rather than silently choosing one.

Keep input parsing separate from gameplay logic.

---

# 5. Initial UI

The main game screen should contain three major regions:

## Board

Eight empty drop boxes arranged evenly around the vertices of an octagon.

The octagon itself may be implied rather than drawn heavily.

The boxes should be visually prominent and large enough to contain pieces of 1–3 letters.

## Piece Bank

A bank containing all eight pieces in randomized order.

For example:

```text
[ ING ] [ AD ] [ TH ] [ ER ]
[ HE  ] [ IMB] [ AL ] [ LE ]
```

Pieces should look tactile and draggable.

## Words Panel

A panel headed something like:

```text
WORDS
0 / 9
```

The panel begins empty.

Do **not** display the undiscovered solution words.

As the current arrangement creates solution words, those words appear in this panel.

---

# 6. Drag-and-Drop Behavior

The player must be able to:

- drag a piece from the bank into an empty octagon position;
- drag a piece from one octagon position to another;
- return a piece from the board to the bank;
- drop a piece onto an already occupied position.

For the last case, use intuitive swapping behavior.

If:

```text
Node A = HE
Node B = AD
```

and the player drags `HE` onto Node B, swap the pieces:

```text
Node A = AD
Node B = HE
```

Do not require the user to manually empty a node first.

Pieces may never be duplicated or lost.

Use pointer-friendly drag-and-drop that works with both mouse and touch interaction.

Prefer a mature drag-and-drop library such as `@dnd-kit/core` unless there is a strong reason not to.

Also support an accessible click-based interaction where practical:

1. click/tap a piece;
2. click/tap a destination.

---

# 7. Arrow Rendering

Render the directed graph in SVG behind or between the eight drop positions.

Edges must be **curved arcs**, not straight lines.

Each edge should:

- be gray;
- have an arrowhead;
- clearly show direction;
- begin and end at the boundaries of boxes rather than underneath their centers;
- have thickness proportional to its edge weight.

For example:

```text
weight 1 → thin
weight 2 → medium
weight 3 → noticeably thicker
```

Use a bounded scale rather than allowing very large weights to produce absurdly thick lines.

For example:

```ts
strokeWidth = scale(weight, minWeight, maxWeight, 1.5, 6)
```

Exact values may be tuned visually.

The arrows are always visible from the beginning.

They are **clues**.

Do not label arrows with word names, weights, or piece names.

---

# 8. Reciprocal Connections

The graph may contain both:

```text
A → B
```

and:

```text
B → A
```

These must render as two visibly distinct curved arrows rather than directly overlapping one another.

Use opposite curvature for reciprocal edges.

Likewise, choose curvature intelligently so that arrows remain readable in dense boards.

---

# 9. Octagonal Node Layout

Place the eight nodes at evenly spaced angles around a circle:

```text
        □

   □         □

 □             □

   □         □

      □   □
```

The exact geometry should form a clean, symmetric octagonal arrangement.

Use responsive sizing rather than fixed pixel coordinates wherever practical.

The board should remain usable on a normal laptop browser and should degrade sensibly to narrower screens.

Desktop-first is acceptable for this version.

---

# 10. Choosing Which Piece Corresponds to Which Hidden Node

The graph needs a hidden canonical assignment of pieces to octagon positions.

The player must never see this assignment.

If board JSON eventually contains an explicit layout, respect it.

Otherwise, derive one automatically.

Because there are only:

```text
8! = 40,320
```

possible circular assignments, it is acceptable to evaluate permutations to find a visually clean arrangement.

Prefer layouts that:

1. minimize edge crossings;
2. avoid unnecessarily long chords;
3. distribute dense connections cleanly;
4. produce readable arrow geometry.

The algorithm must be deterministic for the same puzzle.

Do not expose the canonical piece labels in the rendered node DOM in an obvious user-visible way.

The canonical mapping is used only to construct the anonymous directed graph.

---

# 11. Critical Gameplay Rule: Words Come From Directed Paths

After the player places pieces, inspect the current labeled graph.

A solution word is currently formed when three distinct occupied nodes form a directed path:

```text
Node A → Node B → Node C
```

and:

```text
piece(A) + piece(B) + piece(C)
```

equals one of the board's solution words.

Example:

Suppose the current board contains:

```text
HE → AD → ER
```

Then:

```text
HE + AD + ER = HEADER
```

and `HEADER` should immediately appear in the Words panel.

If the player instead has:

```text
AD → HE → ER
```

then `HEADER` is not formed.

Direction matters.

---

# 12. Word Detection Must Be Live

The Words panel represents **words implied by the player's current arrangement**, not a historical list of words they once discovered.

Therefore:

- when a word becomes valid, add it immediately;
- when the player moves a piece and breaks that word, remove it immediately.

Example:

```text
HE → AD → ER
```

creates:

```text
HEADER
```

If `ER` is then moved away, `HEADER` disappears from the Words panel.

This is essential because the goal is to find a single arrangement in which **all solution words exist simultaneously**.

---

# 13. Do Not Require Exact Canonical Placement

The hidden canonical piece-to-node mapping is a mechanism for constructing the graph.

It should **not** be the definition of whether the player wins.

There may theoretically be another labeling of the graph that produces exactly the same complete solution set.

That should count as a correct solution.

Therefore, the player wins when:

```text
all 8 pieces are placed
```

and:

```text
current formed solution words == complete target solution set
```

Do not merely compare the player's positions against the canonical hidden layout.

The puzzle is about satisfying the word graph, not guessing an arbitrary internal ordering.

---

# 14. Which Words Count During Gameplay

The Python puzzle generator is responsible for ensuring that the supplied solution set contains **all accidental dictionary words** associated with the eight pieces.

The web application should therefore use the supplied solution set as its vocabulary.

It does NOT need to ship an entire English dictionary to the browser.

During an incorrect intermediate arrangement, three pieces might coincidentally spell some other English word that is not part of the supplied puzzle data.

Do not count or display such a word.

Only words appearing in the board's supplied solution set count toward gameplay.

---

# 15. Words Panel Behavior

The Words panel starts completely empty except for its heading/progress count.

For example:

```text
WORDS
0 / 9
```

After finding some words:

```text
WORDS
3 / 9

HEADER
HEADING
LEADER
```

Sort displayed words alphabetically.

Use a subtle animation when a new word appears.

When a word ceases to exist because the board changed, remove it cleanly.

Do not show blank placeholders corresponding to undiscovered words because that leaks information about word lengths.

Showing the total number of words is acceptable.

---

# 16. Completion State

When every solution word exists simultaneously:

- clearly indicate that the puzzle is solved;
- visually celebrate without obscuring the board permanently;
- disable nothing unnecessarily;
- allow the player to inspect the solved board.

A simple tasteful completion modal/banner is sufficient:

```text
Octagram complete!
9 / 9 words
```

Optional light animation/confetti is fine, but keep it restrained.

The completion condition must be based on the live solution-set comparison described above.

---

# 17. Controls

Include at minimum:

### Reset

Return all pieces to the bank and empty every board position.

### Shuffle Bank

Randomize only the order of pieces currently in the bank.

Do not change the graph.

Avoid adding unnecessary game features yet.

Do not implement:

- accounts;
- timers;
- leaderboards;
- hints;
- streaks;
- multiplayer;
- daily puzzle infrastructure;
- server persistence.

Those can come later.

---

# 18. Technology

Use:

```text
React
TypeScript
Vite
```

Use SVG for graph rendering.

Keep game-state logic separate from React presentation components.

A reasonable structure is:

```text
src/
  components/
    OctagramBoard.tsx
    OctagramNode.tsx
    PieceBank.tsx
    PieceTile.tsx
    WordsPanel.tsx
    CompletionDialog.tsx

  game/
    boardParser.ts
    constructions.ts
    graph.ts
    layout.ts
    gameState.ts
    wordDetection.ts
    validation.ts

  data/
    exampleBoard.json

  types/
    game.ts

  App.tsx
  main.tsx

tests/
```

Exact organization may vary, but do not put graph derivation, drag-and-drop behavior, rendering, and word detection into one giant component.

---

# 19. State Representation

Keep a simple authoritative mapping:

```ts
type NodeId = string;

type Placement = Record<NodeId, string | null>;
```

The bank should preferably be derived from:

```text
allPieces - currentlyPlacedPieces
```

rather than maintained as an independent source of truth that can drift out of sync.

Derived state should include:

```ts
currentWords
placedPieceCount
isSolved
```

Do not duplicate derived values unnecessarily in React state.

---

# 20. Graph Representation

Use an explicit directed weighted graph model, for example:

```ts
interface GraphEdge {
  from: NodeId;
  to: NodeId;
  weight: number;
}
```

Build the graph by iterating through every solution construction.

For:

```ts
["he", "ad", "er"]
```

increment:

```text
he → ad
ad → er
```

Merge repeated directed edges and increment their weights.

Do NOT create an edge from the first piece directly to the third piece.

A three-piece word corresponds to a two-edge directed path.

---

# 21. Important Edge Case: Shared Edges Do Not Define Words by Themselves

A graph can create a path that was not itself one of the original words.

Therefore, do not assume every directed length-two path is automatically a solution.

For every length-two path currently occupied:

1. concatenate the three pieces;
2. check the resulting string against the supplied solution set;
3. count it only if it is a target word.

Example pseudocode:

```ts
for (const path of allDirectedLengthTwoPaths(graph)) {
  const [a, b, c] = path;

  if (!placement[a] || !placement[b] || !placement[c]) {
    continue;
  }

  const candidate =
    placement[a] +
    placement[b] +
    placement[c];

  if (targetWords.has(candidate)) {
    currentWords.add(candidate);
  }
}
```

Use three distinct nodes.

---

# 22. Multiple Constructions of the Same Word

The data model should support the rare case where a solution word can be constructed from the available pieces in more than one way.

A word counts as formed if **any valid construction/path** is present.

It still appears only once in the Words panel.

---

# 23. Styling Direction

Make the first version polished but restrained.

Desired feel:

- editorial;
- intelligent;
- clean;
- tactile;
- more like a newspaper/word puzzle than an arcade game.

Use:

- warm or neutral page background;
- dark readable typography;
- light borders around empty slots;
- gray graph arrows;
- slightly raised piece tiles;
- generous whitespace.

Avoid:

- neon colors;
- gradients everywhere;
- cartoon styling;
- excessive shadows;
- video-game HUD aesthetics.

The graph and pieces should remain the visual focus.

---

# 24. Responsive Behavior

Desktop is the priority, but the implementation should not assume one screen size.

On wider screens, a reasonable arrangement is:

```text
Piece Bank      Octagram Board      Words
```

or:

```text
             Octagram Board

Piece Bank                     Words
```

depending on which is visually stronger.

On narrow screens, stack sections vertically while keeping the octagram usable.

SVG geometry should scale with its container.

---

# 25. Board Validation

Before starting gameplay, validate loaded board data.

Check:

- exactly 8 unique pieces;
- each piece contains 1–3 alphabetic characters;
- every solution uses exactly 3 pieces;
- every solution construction concatenates to its word;
- all construction pieces exist on the board;
- no construction uses one physical piece twice;
- at least one solution exists.

If invalid, show a developer-friendly error instead of crashing.

The Python generator remains responsible for deeper Octagram construction rules such as usage counts and dictionary quality.

---

# 26. Example Fixture

Include the supplied puzzle as the initial development fixture.

Normalized form:

```json
{
  "pieces": [
    "ad",
    "al",
    "er",
    "he",
    "imb",
    "ing",
    "le",
    "th"
  ],
  "solutions": [
    {
      "word": "header",
      "pieces": ["he", "ad", "er"]
    },
    {
      "word": "heading",
      "pieces": ["he", "ad", "ing"]
    },
    {
      "word": "healer",
      "pieces": ["he", "al", "er"]
    },
    {
      "word": "healing",
      "pieces": ["he", "al", "ing"]
    },
    {
      "word": "health",
      "pieces": ["he", "al", "th"]
    },
    {
      "word": "leader",
      "pieces": ["le", "ad", "er"]
    },
    {
      "word": "leading",
      "pieces": ["le", "ad", "ing"]
    },
    {
      "word": "lethal",
      "pieces": ["le", "th", "al"]
    },
    {
      "word": "thimble",
      "pieces": ["th", "imb", "le"]
    }
  ]
}
```

Use this exact fixture in development and tests.

---

# 27. Tests

Use a modern TypeScript testing framework such as Vitest.

At minimum test the following.

## Construction derivation

Given the legacy example data:

```text
header
```

must resolve to:

```text
he + ad + er
```

## Edge weights

Verify the example board produces:

```text
HE → AD = 2
HE → AL = 3
AD → ER = 2
AD → ING = 2
```

and the other expected edges.

## Correct word detection

A placement creating:

```text
HE → AD → ER
```

must detect `HEADER`.

## Directionality

A placement creating:

```text
ER → AD → HE
```

must not detect `HEADER`.

## Partial placement

A path with one empty position must not form a word.

## Word removal

If `HEADER` is currently formed and `ER` moves away, `HEADER` must disappear.

## Shared-edge behavior

A random graph path must not count unless its concatenation is a supplied target word.

## Completion

The game is solved only when all target words are simultaneously formed and all eight pieces are placed.

## Reset

Reset must return all pieces to the bank and clear the current word list.

---

# 28. Development Commands

The finished repository should support conventional commands:

```bash
npm install
npm run dev
npm run test
npm run build
npm run preview
```

Add:

```bash
npm run lint
```

if linting is configured.

The project should build without warnings caused by our code.

---

# 29. README

Update the README with:

- a short explanation of Octagram;
- installation instructions;
- how to run the development server;
- how board JSON is structured;
- how the directed graph is derived;
- how a word is recognized;
- how to load a different generated board;
- how to run tests.

Include the example `HEADER = HE → AD → ER` because it concisely explains the game.

---

# 30. Architecture Principle

Keep these concepts separate:

```text
PUZZLE DATA
Which pieces and solution words belong to this game?

GRAPH
What anonymous directed/weighted structure represents those words?

PLACEMENT
Which pieces has the player put on which nodes?

WORD DETECTION
Which target words are implied by the current placement?

PRESENTATION
How are the octagon, arrows, pieces, and words rendered?
```

React components should primarily render state and dispatch user actions.

They should not contain the core graph or word-recognition algorithms.

---

# 31. Acceptance Criteria

This stage is complete when I can run:

```bash
npm install
npm run dev
```

open the app in a browser, and see:

1. eight empty boxes arranged around an octagon;
2. gray curved directed arrows connecting those boxes;
3. thicker arrows for more heavily reused directed connections;
4. a randomized bank containing the eight pieces;
5. an initially empty Words panel;
6. working drag-and-drop into and among octagon positions;
7. words appearing immediately when the current arrangement produces them;
8. words disappearing when that arrangement is broken;
9. a correct progress count;
10. a solved state once the complete solution set exists simultaneously.

For the supplied example, arranging the board correctly must simultaneously produce:

```text
HEADER
HEADING
HEALER
HEALING
HEALTH
LEADER
LEADING
LETHAL
THIMBLE
```

The implementation should be clean enough that the next development stage can focus on visual refinement, additional puzzles, game progression, and deployment rather than rewriting the core game engine.
