"""Offline contract tests plus optional installed-wordfreq integration."""

import json
import math
import sys
from types import SimpleNamespace

import pytest

from octagram.cli import main
import octagram.dictionary as dictionary_module
from octagram.dictionary import Dictionary
from octagram.models import Board, Solution, ValidationResult
from octagram.scoring import score_board
from octagram.search import find_boards
from octagram.validation import validate_board


@pytest.fixture
def wordfreq_data(monkeypatch):
    values = {
        "tester": 4.5,
        "cat": 4.0,
        "planet": 3.0,
        "rarity": 2.99,
        "commuter": 3.5,
        "centre": 4.5,
        "center": 4.5,
        "centres": 4.0,
        "centers": 4.0,
        "colour": 4.0,
        "colors": 4.0,
        "colours": 4.0,
        "theatre": 4.0,
        "theater": 4.0,
        "realise": 4.0,
        "realize": 4.0,
        "advertise": 4.0,
        "surprise": 4.0,
        "a": 7.0,
        "an": 6.0,
        "123": 5.0,
        "can't": 4.0,
        "ice cream": 4.0,
        "café": 4.0,
        "abcdefghij": 4.0,
    }

    def iter_wordlist(lang, wordlist):
        assert (lang, wordlist) == ("en", "large")
        return iter(values)

    def zipf_frequency(word, lang, wordlist):
        assert (lang, wordlist) == ("en", "large")
        return values[word]

    monkeypatch.setitem(
        sys.modules,
        "wordfreq",
        SimpleNamespace(iter_wordlist=iter_wordlist, zipf_frequency=zipf_frequency),
    )
    non_american = {"centre", "centres", "colour", "colours", "theatre", "realise"}
    monkeypatch.setattr(
        dictionary_module,
        "_american_speller",
        lambda: SimpleNamespace(lookup=lambda word: word not in non_american),
    )


def test_wordfreq_filters_tokens_and_preserves_frequency(wordfreq_data):
    dictionary = Dictionary.from_wordfreq()
    assert dictionary.words == {
        "tester",
        "planet",
        "commuter",
        "center",
        "centers",
        "colors",
        "theater",
        "realize",
        "advertise",
        "surprise",
    }
    assert dictionary.frequencies["tester"] == pytest.approx(10**4.5)
    assert "rarity" in Dictionary.from_wordfreq(2.0).words
    assert "commuter" not in Dictionary.from_wordfreq(4.0).words


def test_generated_dictionary_excludes_non_american_spellings(wordfreq_data):
    dictionary = Dictionary.from_wordfreq()
    excluded = {"centre", "centres", "colour", "colours", "theatre", "realise"}
    assert not excluded & dictionary.words
    assert not excluded & dictionary.frequencies.keys()
    assert {"center", "centers", "colors", "theater", "realize"} <= dictionary.words
    # Legitimate -ise words must not be rejected by a blanket suffix rule.
    assert {"advertise", "surprise"} <= dictionary.words


def test_non_american_words_do_not_count_as_accidental_solutions(wordfreq_data):
    dictionary = Dictionary.from_wordfreq()
    pieces = ("ce", "nt", "re", "er", "abc", "def", "ghi", "jkl")
    result = validate_board(Board(pieces), dictionary)
    assert "center" in {solution.word for solution in result.solutions}
    assert "centre" not in {solution.word for solution in result.solutions}
    seeded = validate_board(Board(pieces), dictionary, "centre")
    assert "centre" in {solution.word for solution in seeded.solutions}
    assert "centre" not in dictionary.words


def test_missing_spelling_dependency_gives_install_instructions(monkeypatch):
    monkeypatch.setitem(sys.modules, "spylls.hunspell", None)
    dictionary_module._american_speller.cache_clear()
    with pytest.raises(ValueError, match="spylls.*pip install"):
        dictionary_module._american_speller()


@pytest.mark.parametrize("cutoff", [-1, 9, math.nan, math.inf])
def test_invalid_cutoff(cutoff):
    with pytest.raises(ValueError, match="min_zipf"):
        Dictionary.from_wordfreq(cutoff)


def test_common_words_rank_higher_without_changing_validity():
    result = ValidationResult(
        Board(("pl", "an", "et", "gh", "ij", "kl", "mn", "op")),
        (Solution("planet", (("pl", "an", "et"),)),),
        {},
        (),
    )
    rare = Dictionary(frozenset({"planet"}), {"planet": 100})
    common = Dictionary(frozenset({"planet"}), {"planet": 100000})
    unknown = Dictionary.from_words(["planet"])
    assert (
        score_board(result, common)
        > score_board(result, rare)
        > score_board(result, unknown)
    )
    assert result.valid


def test_cli_uses_wordfreq_by_default_and_reports_score(wordfreq_data, capsys):
    assert main(["evaluate", "com", "mut", "er", "ing", "ed", "re", "un", "st"]) == 0
    output = json.loads(capsys.readouterr().out)
    assert "commuter" in {s["word"] for s in output["solutions"]}
    assert output["word_frequencies"]["commuter"] == pytest.approx(10**3.5)
    assert "score" in output


def test_cli_respects_cutoff(wordfreq_data, capsys):
    main(
        [
            "evaluate",
            "com",
            "mut",
            "er",
            "ing",
            "ed",
            "re",
            "un",
            "st",
            "--min-zipf",
            "4",
        ]
    )
    assert json.loads(capsys.readouterr().out)["solutions"] == []


def test_cli_rejects_conflicting_sources():
    with pytest.raises(SystemExit) as error:
        main(["find", "commuter", "--dictionary", "words.txt", "--min-zipf", "3"])
    assert error.value.code == 2


def test_missing_dependency_gives_install_instructions(monkeypatch):
    monkeypatch.setitem(sys.modules, "wordfreq", None)
    with pytest.raises(ValueError, match="pip install"):
        Dictionary.from_wordfreq()


def test_installed_wordfreq_integration():
    pytest.importorskip("wordfreq")
    pytest.importorskip("spylls")
    dictionary = Dictionary.from_wordfreq()
    assert {"tester", "planet", "commuter"} <= dictionary.words
    assert dictionary.frequencies["planet"] > dictionary.frequencies["commuter"]
    assert all(
        w.isascii() and w.isalpha() and 6 <= len(w) <= 9 for w in dictionary.words
    )


def test_installed_wordfreq_search_tester():
    pytest.importorskip("wordfreq")
    pytest.importorskip("spylls")
    dictionary = Dictionary.from_wordfreq()
    results = find_boards(
        "tester", dictionary, num_results=3, attempts=100, random_seed=0
    )
    assert len(results) == 3
    assert all(validate_board(r.board, dictionary, "tester").valid for r in results)
    assert all("tester" in {s.word for s in r.solutions} for r in results)


def test_installed_american_spelling_integration():
    pytest.importorskip("wordfreq")
    pytest.importorskip("spylls")
    dictionary = Dictionary.from_wordfreq()
    assert {
        "center",
        "centers",
        "colors",
        "theater",
        "realize",
        "surprise",
    } <= dictionary.words
    assert (
        not {"centre", "centres", "colour", "colours", "theatre", "realise"}
        & dictionary.words
    )
    assert (
        not {"centre", "centres", "colour", "colours", "theatre", "realise"}
        & dictionary.frequencies.keys()
    )
