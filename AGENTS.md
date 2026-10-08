# Repository Guidelines

## Project Structure & Module Organization

Keep Octagram board generation separate from any future game UI. Use a small Python package such as:

- `octagram/dictionary.py` — dictionary loading, filtering, and word-frequency metadata.
- `octagram/constructions.py` — split words into exactly three atomic 1–3 letter pieces.
- `octagram/search.py` — candidate-board search and pruning.
- `octagram/validation.py` — canonical game-rule validation.
- `octagram/scoring.py` — board-quality ranking only.
- `octagram/models.py` — typed board, solution, and construction models.
- `octagram/cli.py` — commands such as `find`, `splits`, and `evaluate`.
- `tests/` — unit tests using small synthetic dictionaries.

Do not bury game rules inside search heuristics. Dictionary, validation, search, and scoring must remain independently replaceable.

## Build, Test, and Development Commands

Use Python 3.11+ and a virtual environment.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
python -m octagram find commuter --num-results 10
ruff check .
ruff format --check .
```

If packaging or tooling differs, update this section with the actual commands.

## Coding Style & Naming Conventions

Use 4-space indentation, type hints for public APIs, and `snake_case` for functions/modules. Use `PascalCase` for dataclasses and other types. Prefer small pure functions for segmentation, validation, and scoring. Keep constants in `UPPER_SNAKE_CASE`. Format and lint with Ruff.

## Testing Guidelines

Use `pytest`. Name tests `test_*.py` and test functions `test_<behavior>()`. Cover segmentation, piece permutations, atomic-piece behavior, the two-single-letter limit, seed inclusion, complete accidental-word discovery, piece-usage rules, morphological-duplicate rejection, and deterministic seeded search. Validation tests should not depend on the production English dictionary.

## Octagram-Specific Rules

A board has exactly eight unique 1–3 letter pieces. Every solution uses exactly three distinct pieces, in any order. All constructible dictionary-valid words count, including accidental ones. At least seven pieces must appear in at least two solution words. Reject boards containing trivial morphological duplicates such as `COMMUTE`/`COMMUTER` or `PLAY`/`PLAYED`; never hide one of the words instead.

## Commit & Pull Request Guidelines

This is a new project with no established Git convention yet. Use short imperative commits, e.g. `Add exhaustive board validator`. Pull requests should describe behavior changes, include tests, and note any rule or output-schema changes. Keep unrelated refactors separate.
