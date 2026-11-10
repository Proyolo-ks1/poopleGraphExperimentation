import json
from collections import deque
from pathlib import Path
from string import ascii_lowercase

ROOT = Path(__file__).resolve().parent.parent

INPUT_DIR = ROOT / "Assets" / "4-letter-word-lists"
OUTPUT_DIR = ROOT / "Assets" / "poople-path-statistics"

SOURCES = [
    INPUT_DIR / "fourLetterWords-dwyl-words_alpha.json",
    INPUT_DIR / "fourLetterWords-poople-from-JS.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize35.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize50.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize60.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize70.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize80.json",
    INPUT_DIR / "fourLetterWords-words-EsdbSize85.json",
]

START_WORD = "poop"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def get_neighbors(word, words):
    for i in range(len(word)):
        for letter in ascii_lowercase:
            if letter == word[i]:
                continue

            candidate = word[:i] + letter + word[i + 1 :]

            if candidate in words:
                yield candidate


def calculate_path_statistics(words):
    distances = {START_WORD: 0}
    solutions = {START_WORD: 1}

    queue = deque([START_WORD])

    while queue:
        current = queue.popleft()
        current_distance = distances[current]

        for neighbor in get_neighbors(current, words):
            new_distance = current_distance + 1

            if neighbor not in distances:
                distances[neighbor] = new_distance
                solutions[neighbor] = solutions[current]

                queue.append(neighbor)

            elif distances[neighbor] == new_distance:
                solutions[neighbor] += solutions[current]

    return distances, solutions


for source in SOURCES:
    if not source.is_file():
        print(f"SKIPPED: File not found: {source}")
        continue

    with source.open("r", encoding="utf-8") as file:
        words = set(json.load(file))

    if START_WORD not in words:
        print(f"SKIPPED: {source.name} does not contain {START_WORD.upper()}")
        continue

    distances, solutions = calculate_path_statistics(words)

    result = [
        {
            "word": word,
            "moves": distances.get(word),
            "solutions": solutions.get(word, 0),
            "neighbors": sum(1 for _ in get_neighbors(word, words)),
        }
        for word in sorted(words)
    ]

    output = OUTPUT_DIR / source.name.replace("fourLetterWords-", "pooplePathStats-", 1)

    with output.open("w", encoding="utf-8") as file:
        json.dump(result, file, indent=2)

    reachable = len(distances)
    unreachable = len(words) - reachable

    longest_distance = max(distances.values())
    longest_words = [
        word for word, distance in distances.items() if distance == longest_distance
    ]

    print(
        f"{source.name:<42} "
        f"Words: {len(words):>7,} | "
        f"Reachable: {reachable:>7,} | "
        f"Unreachable: {unreachable:>6,} | "
        f"Longest: {longest_distance:>3} moves "
        f"({len(longest_words)} words)"
    )

print(f"\nOutput directory: {OUTPUT_DIR}")
