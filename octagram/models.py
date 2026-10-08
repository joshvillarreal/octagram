"""Immutable data exchanged between independent generator components."""

from dataclasses import dataclass

Construction = tuple[str, str, str]


@dataclass(frozen=True)
class Board:
    pieces: tuple[str, ...]


@dataclass(frozen=True)
class Solution:
    word: str
    constructions: tuple[Construction, ...]


@dataclass(frozen=True)
class ValidationResult:
    board: Board
    solutions: tuple[Solution, ...]
    usage: dict[str, int]
    errors: tuple[str, ...]

    @property
    def valid(self) -> bool:
        return not self.errors
