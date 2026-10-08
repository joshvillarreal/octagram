"""Quality ranking, independent of game-rule acceptance."""

import math

from octagram.dictionary import Dictionary
from octagram.models import ValidationResult


def score_board(result: ValidationResult, dictionary: Dictionary) -> float:
    """Favor three or four distinct solution words per piece and common words.

    Usage contributes up to two points per piece, falling on either side of
    the target. Solution-count credit saturates at ten. Average log-frequency
    keeps commonality from rewarding sheer volume and overwhelming the target.
    """
    usage_score = 2 * sum(
        1 / (1 + max(3 - count, count - 4, 0)) for count in result.usage.values()
    )
    commonality = sum(
        math.log10(1 + dictionary.frequencies.get(s.word, 0)) for s in result.solutions
    ) / max(len(result.solutions), 1)
    return usage_score + 0.25 * min(len(result.solutions), 10) + 0.25 * commonality
