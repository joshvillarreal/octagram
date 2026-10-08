"""Load normalized words and optional frequency and morphological metadata."""

from dataclasses import dataclass, field
from functools import lru_cache
import math
from pathlib import Path
from typing import Iterable


@lru_cache(maxsize=1)
def _american_speller():
    """Load SCOWL's American Hunspell dictionary once, including affix rules."""
    try:
        from spylls.hunspell import Dictionary as SpellingDictionary
    except ImportError as error:
        raise ValueError(
            'spylls is required for American spelling; run pip install -e ".[dev]"'
        ) from error
    return SpellingDictionary.from_files("en_US")


def normalize_word(word: str) -> str:
    return word.strip().lower()


@dataclass(frozen=True)
class Dictionary:
    """Word membership with frequencies expressed as occurrences per billion."""

    words: frozenset[str]
    frequencies: dict[str, float] = field(default_factory=dict)
    families: dict[str, str] = field(default_factory=dict)

    @classmethod
    def from_words(cls, words: Iterable[str]) -> "Dictionary":
        normalized = (normalize_word(word) for word in words)
        return cls(frozenset(w for w in normalized if w.isascii() and w.isalpha()))

    @classmethod
    def from_wordfreq(cls, min_zipf: float = 3.0) -> "Dictionary":
        """Build English membership and commonality from bundled wordfreq data.

        Only ASCII alphabetic tokens of length 6–9 accepted by the American
        English spelling dictionary can be Octagram solutions.
        The cutoff defines membership; all constructible retained words count.
        """
        if not math.isfinite(min_zipf) or not 0 <= min_zipf <= 8:
            raise ValueError("min_zipf must be finite and between 0 and 8")
        try:
            from wordfreq import iter_wordlist, zipf_frequency
        except ImportError as error:
            raise ValueError(
                'wordfreq is required for the default dictionary; run pip install -e ".[dev]"'
            ) from error

        speller = _american_speller()
        frequencies = {}
        for token in iter_wordlist("en", wordlist="large"):
            word = normalize_word(token)
            if not word.isascii() or not word.isalpha() or not 6 <= len(word) <= 9:
                continue
            zipf = zipf_frequency(word, "en", wordlist="large")
            if zipf >= min_zipf and speller.lookup(word):
                frequencies[word] = 10**zipf
        return cls(frozenset(frequencies), frequencies)

    @classmethod
    def load(cls, path: str | Path) -> "Dictionary":
        """Read lines of WORD [NONNEGATIVE_FREQUENCY [MORPHOLOGICAL_FAMILY]]."""
        words, frequencies, families = set(), {}, {}
        for number, line in enumerate(Path(path).read_text().splitlines(), 1):
            fields = line.split("#", 1)[0].split()
            if not fields:
                continue
            if len(fields) > 3:
                raise ValueError(f"Line {number}: expected word, frequency, family")
            word = normalize_word(fields[0])
            if not word.isascii() or not word.isalpha():
                raise ValueError(f"Line {number}: expected an ASCII alphabetic word")
            words.add(word)
            if len(fields) >= 2:
                frequency = float(fields[1])
                if not 0 <= frequency < float("inf"):
                    raise ValueError(
                        f"Line {number}: frequency must be finite and nonnegative"
                    )
                frequencies[word] = frequency
            if len(fields) == 3:
                families[word] = fields[2].lower()
        return cls(frozenset(words), frequencies, families)
