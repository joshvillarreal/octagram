"""Enumerate atomic three-piece word constructions."""

from octagram.dictionary import normalize_word
from octagram.models import Construction


def split_word(word: str) -> tuple[Construction, ...]:
    """Return every split into three distinct pieces of two to three letters."""
    word = normalize_word(word)
    if not word.isascii() or not word.isalpha():
        return ()
    results = []
    for first in range(2, 4):
        for second in range(2, 4):
            third = len(word) - first - second
            if 2 <= third <= 3:
                pieces = (
                    word[:first],
                    word[first : first + second],
                    word[first + second :],
                )
                if len(set(pieces)) == 3:
                    results.append(pieces)
    return tuple(results)
