"""JSON command-line interface for construction, validation, and search."""

import argparse
from dataclasses import asdict
import json

from octagram.constructions import split_word
from octagram.dictionary import Dictionary
from octagram.models import Board
from octagram.scoring import score_board
from octagram.search import find_boards
from octagram.validation import validate_board


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate and validate Octagram boards"
    )
    commands = parser.add_subparsers(dest="command", required=True)
    splits = commands.add_parser("splits", help="List atomic three-piece constructions")
    splits.add_argument("word")
    find = commands.add_parser(
        "find", help="Search an English dictionary for valid boards"
    )
    find.add_argument(
        "seed", help="Required solution; dictionary membership is optional"
    )
    find.add_argument("--num-results", type=int, default=10)
    find.add_argument("--attempts", type=int, default=10000)
    find.add_argument("--random-seed", type=int, default=0)
    evaluate = commands.add_parser(
        "evaluate", help="Exhaustively validate eight pieces"
    )
    evaluate.add_argument("pieces", nargs=8)
    evaluate.add_argument(
        "--seed", help="Required solution allowed outside the dictionary"
    )
    for command in (find, evaluate):
        source = command.add_mutually_exclusive_group()
        source.add_argument(
            "--dictionary", help="Use a word-list file instead of wordfreq"
        )
        source.add_argument(
            "--min-zipf",
            type=float,
            help="Minimum wordfreq commonality (0–8; default: 3)",
        )
    args = parser.parse_args(argv)
    try:
        if args.command == "splits":
            output = split_word(args.word)
        else:
            dictionary = (
                Dictionary.load(args.dictionary)
                if args.dictionary
                else Dictionary.from_wordfreq(
                    3.0 if args.min_zipf is None else args.min_zipf
                )
            )

            def serialize(result):
                return {
                    **asdict(result),
                    "valid": result.valid,
                    "score": score_board(result, dictionary),
                    "word_frequencies": {
                        solution.word: dictionary.frequencies.get(solution.word, 0)
                        for solution in result.solutions
                    },
                }

            if args.command == "evaluate":
                result = validate_board(
                    Board(tuple(p.lower() for p in args.pieces)), dictionary, args.seed
                )
                output = serialize(result)
            else:
                output = [
                    serialize(r)
                    for r in find_boards(
                        args.seed,
                        dictionary,
                        args.num_results,
                        args.attempts,
                        args.random_seed,
                    )
                ]
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(json.dumps(output, indent=2))
    return 0
