"""Rebuild browser dictionary with the same membership as the Python generator.

Run with Python 3.11+ after pip install -e . from the repository root.
"""
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from octagram.dictionary import Dictionary

root = Path(__file__).resolve().parents[1]
dictionary = Dictionary.from_wordfreq()
output = {word: round(math.log10(frequency), 2) for word, frequency in dictionary.frequencies.items()}
(root / "src/data/americanDictionary.json").write_text(
    json.dumps(output, sort_keys=True, separators=(",", ":")) + "\n"
)
print(f"Exported {len(output)} American English words")
