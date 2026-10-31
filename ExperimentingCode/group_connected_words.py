import json
from collections import deque
from pathlib import Path
from string import ascii_lowercase

ROOT = Path(__file__).resolve().parent.parent

INPUT_DIR = ROOT / "Assets" / "4-letter-word-lists"
OUTPUT_DIR = ROOT / "Assets" / "connected-word-groups"

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

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def get_neighbors(word, words):
    for i in range(len(word)):
        for letter in ascii_lowercase:
            if letter == word[i]:
                continue

            candidate = word[:i] + letter + word[i + 1 :]

            if candidate in words:
                yield candidate


def find_connected_components(words):
    unvisited = words.copy()
    components = []

    while unvisited:
        start = min(unvisited)
        unvisited.remove(start)

        queue = deque([start])
        component = []

        while queue:
            current = queue.popleft()
            component.append(current)

            for neighbor in get_neighbors(current, words):
                if neighbor in unvisited:
                    unvisited.remove(neighbor)
                    queue.append(neighbor)

        components.append(sorted(component))

    return sorted(components, key=lambda component: (-len(component), component[0]))


for source in SOURCES:
    if not source.is_file():
        print(f"SKIPPED: File not found: {source}")
        continue

    with source.open("r", encoding="utf-8") as file:
        words = set(json.load(file))

    components = find_connected_components(words)

    output = OUTPUT_DIR / source.name.replace(
        "fourLetterWords-", "connectedWordGroups-", 1
    )

    with output.open("w", encoding="utf-8") as file:
        json.dump(components, file, indent=2)

    largest_component = len(components[0]) if components else 0
    isolated_words = sum(len(c) == 1 for c in components)

    poople_component = next(
        (component for component in components if "poop" in component), None
    )
    poople_size = len(poople_component) if poople_component else 0

    print(
        f"{source.name:<42} "
        f"Words: {len(words):>7,} | "
        f"Groups: {len(components):>5,} | "
        f"Largest: {largest_component:>6,} | "
        f"Isolated: {isolated_words:>5,} | "
        f"POOP: {poople_size:>6,}"
    )
