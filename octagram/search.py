"""Bounded candidate search with exhaustive validation of every candidate."""

import random
from collections import Counter, defaultdict
from itertools import combinations

from octagram.constructions import split_word
from octagram.dictionary import Dictionary, normalize_word
from octagram.models import Board, ValidationResult
from octagram.scoring import score_board
from octagram.validation import validate_board


def find_boards(
    seed: str,
    dictionary: Dictionary,
    num_results: int = 10,
    attempts: int = 10000,
    random_seed: int = 0,
) -> tuple[ValidationResult, ...]:
    """Grow overlapping word constructions; reproducible but not exhaustive.

    Each attempt adds up to five pieces. Extensions supported by more existing
    pairs are favored. Occasional global samples keep disconnected word groups
    reachable. Canonical validation alone determines which boards are accepted.
    """
    if num_results < 1 or attempts < 1:
        raise ValueError("num_results and attempts must be positive")
    seed = normalize_word(seed)
    splits = split_word(seed)
    if not splits:
        raise ValueError(
            "Seed cannot be constructed from three distinct 2–3 letter pieces"
        )
    extensions = defaultdict(set)
    pool = set()
    for word in sorted(dictionary.words | {seed}):
        for construction in split_word(word):
            pieces = sorted(construction)
            pool.update(pieces)
            for pair in combinations(pieces, 2):
                extensions[pair].update(set(pieces) - set(pair))
    index = {pair: tuple(sorted(values)) for pair, values in extensions.items()}
    pool = sorted(pool)
    rng = random.Random(random_seed)
    seen, accepted = set(), []
    for _ in range(attempts):
        base = rng.choice(splits)
        current = set(base)
        if rng.random() < 0.1:
            available = [p for p in pool if p not in current]
            if len(available) < 5:
                break
            current.update(rng.sample(available, 5))
        else:
            for _ in range(5):
                support = Counter(
                    piece
                    for pair in combinations(sorted(current), 2)
                    for piece in index.get(pair, ())
                    if piece not in current
                )
                if not support:
                    break
                choices = sorted(support)
                current.add(
                    rng.choices(choices, weights=[support[p] ** 2 for p in choices])[0]
                )
        if len(current) != 8:
            continue
        pieces = tuple(sorted(current))
        if pieces in seen:
            continue
        seen.add(pieces)
        result = validate_board(Board(pieces), dictionary, seed)
        if result.valid:
            accepted.append(result)
    accepted.sort(key=lambda r: (-score_board(r, dictionary), r.board.pieces))
    return tuple(accepted[:num_results])
