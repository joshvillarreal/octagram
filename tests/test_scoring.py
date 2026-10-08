"""Difficulty preferences rank boards without changing canonical game rules."""

import pytest

from octagram.dictionary import Dictionary
from octagram.models import Board, Solution, ValidationResult
from octagram.scoring import score_board

PIECES = ("ab", "cd", "ef", "gh", "ij", "kl", "mn", "op")


def ranked_result(uses, word_count=9):
    # Isolate score components using already-computed validator output.
    return ValidationResult(
        Board(PIECES),
        tuple(Solution(f"word{i}", ()) for i in range(word_count)),
        dict.fromkeys(PIECES, uses),
        (),
    )


@pytest.mark.parametrize("uses", [0, 1, 2, 5, 6, 12])
def test_target_usage_beats_underuse_and_overuse(uses):
    dictionary = Dictionary.from_words([])
    ideal = score_board(ranked_result(3), dictionary)
    assert ideal == score_board(ranked_result(4), dictionary)
    assert ideal > score_board(ranked_result(uses), dictionary)


def test_more_words_cannot_overwhelm_target_usage():
    dictionary = Dictionary.from_words([])
    assert score_board(ranked_result(3, 8), dictionary) > score_board(
        ranked_result(9, 24), dictionary
    )


def test_commonality_uses_mean_not_total_frequency():
    dictionary = Dictionary(frozenset(), {f"word{i}": 10000 for i in range(20)})
    assert score_board(ranked_result(4, 10), dictionary) == score_board(
        ranked_result(4, 20), dictionary
    )


def test_empty_result_has_finite_score():
    result = ValidationResult(Board(()), (), {}, ())
    assert score_board(result, Dictionary.from_words([])) == 0
