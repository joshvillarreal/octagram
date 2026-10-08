from itertools import permutations, product
import json

import pytest

from octagram.cli import main
from octagram.constructions import split_word
from octagram.dictionary import Dictionary
from octagram.models import Board
from octagram.search import find_boards
from octagram.validation import morphological_duplicates, validate_board

PIECES = ("abc", "def", "ghi", "jkl", "mno", "pqr", "stu", "vwx")


def cycle_dictionary():
    return Dictionary.from_words(
        "".join(PIECES[(i + offset) % 8] for offset in range(3)) for i in range(8)
    )


def test_splits_are_complete_and_distinct():
    expected = {
        ("commuter"[:i], "commuter"[i:j], "commuter"[j:])
        for i in range(1, 8)
        for j in range(i + 1, 8)
        if all(2 <= n <= 3 for n in (i, j - i, 8 - j))
    }
    assert set(split_word("COMMUTER")) == expected
    assert split_word("aaa") == ()
    assert split_word("ab1") == ()


def test_valid_board_and_usage():
    result = validate_board(Board(PIECES), cycle_dictionary(), "abcdefghi")
    assert result.valid
    assert len(result.solutions) == 8
    assert set(result.usage.values()) == {3}


def test_all_accidental_words_and_permutations_count():
    dictionary = Dictionary.from_words("".join(c) for c in permutations(PIECES, 3))
    result = validate_board(Board(PIECES), dictionary)
    assert len(result.solutions) == 336
    assert "ghidefabc" in {s.word for s in result.solutions}


def test_pieces_are_atomic_and_cannot_be_reused():
    dictionary = Dictionary.from_words(["abcdefghi", "abcabcghi", "abdefghi"])
    result = validate_board(Board(PIECES), dictionary)
    assert [s.word for s in result.solutions] == ["abcdefghi"]
    assert not result.valid


def test_usage_counts_words_not_constructions():
    pieces = ("aa", "aaa", "bb", "bc", "de", "fg", "hi", "jk")
    result = validate_board(Board(pieces), Dictionary.from_words(["aaaaabb"]))
    assert len(result.solutions[0].constructions) == 2
    assert result.usage["aa"] == 1
    assert "Ambiguous word: aaaaabb has 2 constructions" in result.errors


@pytest.mark.parametrize(
    "pieces", [PIECES[:-1], (*PIECES[:-1], PIECES[0]), ("a", "b", "c", *PIECES[:5])]
)
def test_invalid_board_structure(pieces):
    assert not validate_board(Board(pieces), cycle_dictionary()).valid


def test_seed_must_be_present():
    result = validate_board(Board(PIECES), cycle_dictionary(), "missing")
    assert "Seed word must be a solution" in result.errors


@pytest.mark.parametrize(
    "pair", [("commute", "commuter"), ("play", "played"), ("run", "running")]
)
def test_morphological_suffixes(pair):
    assert morphological_duplicates(*pair, Dictionary.from_words(pair))


def test_duplicate_board_rejected_without_hiding_words():
    pieces = ("com", "mu", "te", "ter", "abc", "def", "ghi", "jkl")
    result = validate_board(
        Board(pieces), Dictionary.from_words(["commute", "commuter"])
    )
    assert {s.word for s in result.solutions} == {"commute", "commuter"}
    assert any("Morphological duplicates" in e for e in result.errors)


def test_dictionary_metadata(tmp_path):
    path = tmp_path / "words.txt"
    path.write_text("PLAY 10 play\nPLAYED 5 play\n# comment\n")
    dictionary = Dictionary.load(path)
    assert dictionary.frequencies["play"] == 10
    assert morphological_duplicates("play", "played", dictionary)
    path.write_text("play nan\n")
    with pytest.raises(ValueError):
        Dictionary.load(path)


def test_search_reproducible_and_finds_valid_board():
    dictionary = cycle_dictionary()
    first = find_boards("abcdefghi", dictionary, attempts=10, random_seed=42)
    assert first == find_boards("abcdefghi", dictionary, attempts=10, random_seed=42)
    assert len(first) == 1
    assert first[0].valid
    assert all(len(solution.constructions) == 1 for solution in first[0].solutions)
    with pytest.raises(ValueError, match="2–3 letter pieces"):
        find_boards("too-long-seed", dictionary)


def test_search_finds_connected_board_among_unrelated_pieces():
    # The global pool is dominated by unrelated pieces: random five-piece
    # completion is impractical, but overlapping constructions grow the cycle.
    unrelated = [
        "z" + "".join(pair) for pair in product("abcdefghijklmnopqrst", repeat=2)
    ]
    distractors = ["".join(unrelated[i : i + 3]) for i in range(0, 396, 3)]
    dictionary = Dictionary.from_words([*cycle_dictionary().words, *distractors])
    results = find_boards("abcdefghi", dictionary, attempts=25, random_seed=0)
    assert results
    assert results[0].board.pieces == PIECES
    assert all(validate_board(r.board, dictionary, "abcdefghi").valid for r in results)


def test_cli_evaluate(tmp_path, capsys):
    path = tmp_path / "words.txt"
    path.write_text("\n".join(sorted(cycle_dictionary().words)))
    assert main(["evaluate", *PIECES, "--dictionary", str(path)]) == 0
    assert json.loads(capsys.readouterr().out)["valid"] is True


@pytest.mark.parametrize("single", ["a", "s"])
def test_even_one_single_letter_piece_is_rejected(single):
    result = validate_board(Board((*PIECES[:-1], single)), cycle_dictionary())
    assert not result.valid
    assert any("two to three" in error for error in result.errors)


def test_seed_needing_a_single_letter_piece_cannot_be_searched():
    with pytest.raises(ValueError, match="2–3 letter pieces"):
        find_boards("plays", Dictionary.from_words(["plays"]))


def test_splits_never_include_single_letters():
    assert split_word("tester") == (("te", "st", "er"),)
    assert split_word("planet") == (("pl", "an", "et"),)
    assert split_word("played") == (("pl", "ay", "ed"),)


@pytest.mark.parametrize("seed", ["concrete", "abcdefghi", None])
def test_ambiguous_concrete_rejects_board_and_retains_both_constructions(seed):
    pieces = ("con", "cre", "te", "cr", "ete", "abc", "def", "ghi")
    dictionary = Dictionary.from_words(
        "".join(pieces[(i + offset) % 8] for offset in range(3)) for i in range(8)
    )
    result = validate_board(Board(pieces), dictionary, seed)
    # All usage requirements are satisfied; ambiguity itself rejects the board.
    assert sum(count >= 2 for count in result.usage.values()) >= 7
    assert not result.valid
    assert "Ambiguous word: concrete has 2 constructions" in result.errors
    concrete = next(s for s in result.solutions if s.word == "concrete")
    assert set(concrete.constructions) == {("con", "cre", "te"), ("con", "cr", "ete")}


def test_concrete_with_only_one_construction_is_valid():
    pieces = ("con", "cre", "te", "ab", "cd", "ef", "gh", "ij")
    dictionary = Dictionary.from_words(
        "".join(pieces[(i + offset) % 8] for offset in range(3)) for i in range(8)
    )
    result = validate_board(Board(pieces), dictionary, "concrete")
    assert result.valid
    assert all(len(s.constructions) == 1 for s in result.solutions)
    assert next(s for s in result.solutions if s.word == "concrete").constructions == (
        ("con", "cre", "te"),
    )


def test_evaluate_reports_ambiguity(tmp_path, capsys):
    path = tmp_path / "words.txt"
    path.write_text("concrete\n")
    pieces = ("con", "cre", "te", "cr", "ete", "abc", "def", "ghi")
    main(["evaluate", *pieces, "--dictionary", str(path)])
    output = json.loads(capsys.readouterr().out)
    assert output["valid"] is False
    assert "Ambiguous word: concrete has 2 constructions" in output["errors"]
    assert len(output["solutions"][0]["constructions"]) == 2


def test_absent_seed_is_allowed_without_changing_dictionary():
    seed = "abcdefghi"
    words = cycle_dictionary().words - {seed}
    dictionary = Dictionary.from_words(words)
    result = validate_board(Board(PIECES), dictionary, " ABCDEFGHI ")
    assert result.valid
    assert {s.word for s in result.solutions} == words | {seed}
    assert set(result.usage.values()) == {3}
    assert seed not in dictionary.words
    unseeded = validate_board(Board(PIECES), dictionary)
    assert seed not in {s.word for s in unseeded.solutions}


def test_search_generates_board_for_absent_seed():
    seed = "abcdefghi"
    dictionary = Dictionary.from_words(cycle_dictionary().words - {seed})
    results = find_boards(" ABCDEFGHI ", dictionary, attempts=25, random_seed=0)
    assert results
    assert results == find_boards(seed, dictionary, attempts=25, random_seed=0)
    assert all(result.valid for result in results)
    assert all(
        seed in {s.word for s in result.solutions}
        and all(s.word == seed or s.word in dictionary.words for s in result.solutions)
        for result in results
    )
    assert seed not in dictionary.words


def test_seed_exception_does_not_allow_other_unknown_words():
    seed = "abcdefghi"
    other_unknown = "defghijkl"
    dictionary = Dictionary.from_words(cycle_dictionary().words - {seed, other_unknown})
    result = validate_board(Board(PIECES), dictionary, seed)
    assert seed in {s.word for s in result.solutions}
    assert other_unknown not in {s.word for s in result.solutions}


def test_absent_seed_still_rejects_ambiguous_constructions():
    pieces = ("con", "cre", "te", "cr", "ete", "abc", "def", "ghi")
    dictionary = Dictionary.from_words([])
    result = validate_board(Board(pieces), dictionary, "concrete")
    assert not result.valid
    assert "Ambiguous word: concrete has 2 constructions" in result.errors
    assert len(result.solutions[0].constructions) == 2


def test_absent_seed_still_rejects_morphological_duplicates():
    pieces = ("com", "mu", "te", "ter", "abc", "def", "ghi", "jkl")
    dictionary = Dictionary.from_words(["commuter"])
    result = validate_board(Board(pieces), dictionary, "commute")
    assert not result.valid
    assert {s.word for s in result.solutions} == {"commute", "commuter"}
    assert any("Morphological duplicates" in error for error in result.errors)


def test_cli_find_and_evaluate_accept_absent_seed(tmp_path, capsys):
    seed = "abcdefghi"
    path = tmp_path / "words.txt"
    path.write_text("\n".join(sorted(cycle_dictionary().words - {seed})))
    main(["find", seed, "--dictionary", str(path), "--attempts", "25"])
    boards = json.loads(capsys.readouterr().out)
    assert boards
    assert all(board["valid"] for board in boards)
    assert boards[0]["word_frequencies"][seed] == 0
    main(["evaluate", *PIECES, "--dictionary", str(path), "--seed", seed])
    result = json.loads(capsys.readouterr().out)
    assert result["valid"]
    assert seed in {s["word"] for s in result["solutions"]}
