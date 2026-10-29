import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

INPUT_DIR = ROOT / "Assets" / "4-letter-word-lists"
OUTPUT_DIR = ROOT / "Assets" / "word-list-comparisons"

POOPLE_SOURCE = INPUT_DIR / "fourLetterWords-poople-from-JS.json"

SOURCES = [
    INPUT_DIR / "fourLetterWords-dwyl-words_alpha.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize35.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize50.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize60.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize70.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize80.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize85.json",
]

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

with POOPLE_SOURCE.open("r", encoding="utf-8") as file:
    poople_words = set(json.load(file))

print(f"Poople reference: {len(poople_words):,} words\n")

# Load all available dictionaries
dictionaries = {}

for source in SOURCES:
    if not source.is_file():
        print(f"SKIPPED: File not found: {source}")
        continue

    with source.open("r", encoding="utf-8") as file:
        dictionaries[source.name] = set(json.load(file))

# Add a combined dictionary (DWYL + ESDB 85)
dwyl_name = "fourLetterWords-dwyl-words_alpha.json"
esdb85_name = "fourLetterWords-words-EsdbSize85.json"

if dwyl_name in dictionaries and esdb85_name in dictionaries:
    dictionaries["DWYL-ESDB85-combined"] = (
        dictionaries[dwyl_name] | dictionaries[esdb85_name]
    )

print(
    f"{'Dictionary':<42} "
    f"{'Total':>7} "
    f"{'Shared':>7} "
    f"{'Missing':>8} "
    f"{'Extra':>7} "
    f"{'Coverage':>9} "
    f"{'Jaccard':>9}"
)

print("-" * 100)

for dictionary_name, words in dictionaries.items():
    shared = poople_words & words
    missing = poople_words - words
    extra = words - poople_words

    coverage = len(shared) / len(poople_words) * 100
    jaccard = len(shared) / len(poople_words | words) * 100

    print(
        f"{dictionary_name:<42} "
        f"{len(words):>7,} "
        f"{len(shared):>7,} "
        f"{len(missing):>8,} "
        f"{len(extra):>7,} "
        f"{coverage:>8.2f}% "
        f"{jaccard:>8.2f}%"
    )

    output_name = dictionary_name.replace("fourLetterWords-", "comparison-", 1)

    if not output_name.endswith(".json"):
        output_name = f"comparison-{output_name}.json"

    output = OUTPUT_DIR / output_name

    result = {
        "dictionary": dictionary_name,
        "total_words": len(words),
        "poople_total": len(poople_words),
        "shared_count": len(shared),
        "missing_count": len(missing),
        "extra_count": len(extra),
        "coverage_percent": round(coverage, 2),
        "jaccard_percent": round(jaccard, 2),
        "shared_words": sorted(shared),
        "missing_words": sorted(missing),
        "extra_words": sorted(extra),
    }

    with output.open("w", encoding="utf-8") as file:
        json.dump(result, file, indent=2)

print("\nPoople words missing from both DWYL and ESDB 85:")

if "DWYL-ESDB85-combined" in dictionaries:
    missing_from_both = sorted(poople_words - dictionaries["DWYL-ESDB85-combined"])

    print(f"Total: {len(missing_from_both)}")
    print(", ".join(missing_from_both))
