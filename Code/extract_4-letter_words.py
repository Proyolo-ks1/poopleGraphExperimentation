import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

SOURCES = [
    ROOT / "Sources" / "DWYL-Github" / "dwyl-words_alpha.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize35.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize50.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize60.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize70.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize80.txt",
    ROOT / "Sources" / "SCOWL-wl" / "words-EsdbSize85.txt",
]

OUTPUT_DIR = ROOT / "Assets" / "4-letter-word-lists"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for source in SOURCES:
    if not source.is_file():
        print(f"SKIPPED: File not found: {source}")
        continue

    output = OUTPUT_DIR / f"fourLetterWords-{source.stem}.json"

    with source.open("r", encoding="utf-8") as file:
        all_words = [word.strip().lower() for word in file]
        words = sorted(
            {
                word
                for word in all_words
                if len(word) == 4 and word.isascii() and word.isalpha()
            }
        )

    with output.open("w", encoding="utf-8") as file:
        json.dump(words, file, indent=2)

    print(
        f"{source.name:<25} {len(words):>6,} four-letter words / {len(all_words):>7,} total words → {output.name}"
    )
