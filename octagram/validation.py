"""Canonical rules; validation never omits an inconvenient dictionary word."""

from itertools import combinations, permutations

from octagram.dictionary import Dictionary, normalize_word
from octagram.models import Board, Solution, ValidationResult

SUFFIXES = ("s", "es", "ed", "er", "ers", "ing", "ly")


def morphological_duplicates(left: str, right: str, dictionary: Dictionary) -> bool:
    """Use supplied family metadata plus conservative common suffix rules.

    Suffix rules are heuristic: curated family metadata is preferred for English.
    """
    if left in dictionary.families and right in dictionary.families:
        return dictionary.families[left] == dictionary.families[right]
    short, long = sorted((left, right), key=len)
    if len(short) < 3:
        return False
    forms = {short + suffix for suffix in SUFFIXES}
    if short.endswith("e"):
        forms.update((short + "d", short + "r", short + "rs", short[:-1] + "ing"))
    if short.endswith("y"):
        forms.update((short[:-1] + "ies", short[:-1] + "ied"))
    if (
        len(short) >= 3
        and short[-1] not in "aeiou"
        and short[-2] in "aeiou"
        and short[-3] not in "aeiou"
    ):
        forms.update((short + short[-1] + "ed", short + short[-1] + "ing"))
    return long in forms


def validate_board(
    board: Board, dictionary: Dictionary, seed: str | None = None
) -> ValidationResult:
    """Validate dictionary words plus the explicitly requested seed, if any.

    The seed alone is exempt from dictionary membership. It still must be
    constructible, unambiguous, and obey every other board rule.
    """
    seed = normalize_word(seed) if seed is not None else None
    pieces = board.pieces
    errors = []
    if len(pieces) != 8 or len(set(pieces)) != 8:
        errors.append("A board must contain exactly eight unique pieces")
    if any(
        not p.isascii() or not p.isalpha() or not p.islower() or not 2 <= len(p) <= 3
        for p in pieces
    ):
        errors.append("Pieces must contain two to three lowercase ASCII letters")
    if errors:
        return ValidationResult(board, (), {}, tuple(errors))
    found = {}
    for construction in permutations(pieces, 3):
        word = "".join(construction)
        if word in dictionary.words or word == seed:
            found.setdefault(word, []).append(construction)
    solutions = tuple(Solution(w, tuple(sorted(cs))) for w, cs in sorted(found.items()))
    for solution in solutions:
        if len(solution.constructions) > 1:
            errors.append(
                f"Ambiguous word: {solution.word} has "
                f"{len(solution.constructions)} constructions"
            )
    usage = {
        p: sum(any(p in c for c in s.constructions) for s in solutions) for p in pieces
    }
    if sum(count >= 2 for count in usage.values()) < 7:
        errors.append("At least seven pieces must occur in at least two solution words")
    if seed is not None and seed not in found:
        errors.append("Seed word must be a solution")
    for left, right in combinations(found, 2):
        if morphological_duplicates(left, right, dictionary):
            errors.append(f"Morphological duplicates: {left}/{right}")
    return ValidationResult(board, solutions, usage, tuple(errors))
