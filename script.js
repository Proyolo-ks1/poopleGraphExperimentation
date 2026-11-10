import { updateGraph } from "./scripts/graph.js";


const START_WORD = "poop";

const dictionarySelect = document.getElementById("dictionary-select");
const searchInput = document.getElementById("word-search");
const resultElement = document.getElementById("result");

const totalWordsElement = document.getElementById("total-words");
const reachableWordsElement = document.getElementById("reachable-words");
const reachabilityElement = document.getElementById("reachability-percent");

const pathSelector = document.getElementById("path-selector");
const pathIndexInput = document.getElementById("path-index");
const pathIndexLabel = document.getElementById("path-index-label");

const pathSection = document.getElementById("path-section");
const wordPathElement = document.getElementById("word-path");

const pathHeading = document.getElementById("path-heading");
const neighborsHeading = document.getElementById("neighbors-heading");

const neighborsSection = document.getElementById("neighbors-section");
const wordNeighborsElement = document.getElementById("word-neighbors");

const graphSolutionSelector = document.getElementById("graph-solution-selector");
const graphSolutionInput = document.getElementById("graph-solution-index");
const graphSolutionLabel = document.getElementById("graph-solution-label");

const graphCanvas = document.getElementById("graph-canvas");

const copyLinkButton = document.getElementById("graph-copy-link");

const urlParams = new URLSearchParams(window.location.search);

function updateUrlParameter(key, value) {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);

    window.history.replaceState(null, "", url);
}

let words = new Set();
let distances = new Map();
let predecessors = new Map();

let currentPaths = [];

// Find valid words differing by exactly one letter
function getNeighbors(word) {
    const neighbors = [];

    for (let i = 0; i < word.length; i++) {
        for (let code = 97; code <= 122; code++) {
            const letter = String.fromCharCode(code);

            if (letter === word[i]) continue;

            const candidate =
                word.slice(0, i) + letter + word.slice(i + 1);

            if (words.has(candidate)) {
                neighbors.push(candidate);
            }
        }
    }

    return neighbors.sort();
}

// BFS starting at POOP
function calculateDistances(startWord) {
    distances = new Map([[startWord, 0]]);
    predecessors = new Map();

    const queue = [startWord];

    for (let index = 0; index < queue.length; index++) {
        const currentWord = queue[index];
        const currentDistance = distances.get(currentWord);

        for (const neighbor of getNeighbors(currentWord)) {
            const newDistance = currentDistance + 1;

            if (!distances.has(neighbor)) {
                distances.set(neighbor, newDistance);
                predecessors.set(neighbor, [currentWord]);

                queue.push(neighbor);
            } else if (distances.get(neighbor) === newDistance) {
                predecessors.get(neighbor).push(currentWord);
            }
        }
    }
}

// Reconstruct all shortest paths from a word to POOP
function getShortestPaths(word) {
    if (!distances.has(word)) return [];

    if (word === START_WORD) return [[START_WORD]];

    const paths = [];

    for (const predecessor of predecessors.get(word) ?? []) {
        const predecessorPaths = getShortestPaths(predecessor);

        for (const path of predecessorPaths) {
            paths.push([word, ...path]);
        }
    }

    return paths;
}

// Display a word, highlighting the letter changed
function createWordTile(word, nextWord = null) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "word-tile";

    if (word === START_WORD) {
        tile.classList.add("target");
    }

    for (let i = 0; i < word.length; i++) {
        const letter = document.createElement("span");
        letter.textContent = word[i].toUpperCase();

        if (nextWord && word[i] !== nextWord[i]) {
            letter.classList.add("changed-letter");
        } else if (word[i] === START_WORD[i]) {
            letter.classList.add("matching-letter");
        }

        tile.appendChild(letter);
    }

    tile.addEventListener("click", () => {
        searchInput.value = word.toUpperCase();
        updateSearch();
    });

    return tile;
}

// Display the shortest path
function displayPath(path) {
    wordPathElement.replaceChildren();

    for (let i = 0; i < path.length; i++) {
        const word = path[i];
        const nextWord = path[i + 1] ?? null;

        wordPathElement.appendChild(createWordTile(word, nextWord));

        if (nextWord) {
            const arrow = document.createElement("span");
            arrow.className = "path-arrow";
            arrow.textContent = "→";

            wordPathElement.appendChild(arrow);
        }
    }

    pathSection.hidden = path.length === 0;
}

// Display neighboring words
function displayNeighbors(word) {
    wordNeighborsElement.replaceChildren();

    const neighbors = getNeighbors(word);
    neighborsHeading.textContent = `Neighboring words - ${neighbors.length}`;

    for (let position = 0; position < 4; position++) {
        const group = document.createElement("div");
        group.className = "neighbor-group";

        const heading = document.createElement("div");
        heading.className = "neighbor-group-heading";
        heading.textContent = `Letter ${position + 1}`;

        const wordLabel = document.createElement("div");
        wordLabel.className = "neighbor-group-word";

        for (let i = 0; i < 4; i++) {
            const letter = document.createElement("span");
            letter.textContent = word[i].toUpperCase();

            if (i === position) {
                letter.classList.add("changed-letter");
            } else if (word[i] === START_WORD[i]) {
                letter.classList.add("matching-letter");
            }

            wordLabel.appendChild(letter);
        }

        group.appendChild(heading);
        group.appendChild(wordLabel);

        const groupNeighbors = neighbors.filter(
            neighbor => neighbor[position] !== word[position]
        );

        for (const neighbor of groupNeighbors) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "neighbor-tile";

            if (neighbor === START_WORD) {
                button.classList.add("target");
            }

            for (let i = 0; i < 4; i++) {
                const letter = document.createElement("span");
                letter.textContent = neighbor[i].toUpperCase();

                if (i === position) {
                    letter.classList.add("changed-letter");
                } else if (neighbor[i] === START_WORD[i]) {
                    letter.classList.add("matching-letter");
                }

                button.appendChild(letter);
            }

            button.addEventListener("click", () => {
                searchInput.value = neighbor.toUpperCase();
                updateSearch();
            });

            group.appendChild(button);
        }

        if (groupNeighbors.length === 0) {
            const empty = document.createElement("span");
            empty.className = "neighbor-empty";
            empty.textContent = "No neighbors";
            group.appendChild(empty);
        }

        wordNeighborsElement.appendChild(group);
    }

    neighborsSection.hidden = false;
}

// Update search results
function updateSearch() {
    const previousCanvasTop = graphCanvas.getBoundingClientRect().top;
    const word = searchInput.value.trim().toLowerCase();
    updateUrlParameter("word", word);
    localStorage.setItem("lastSearchedWord", word);

    pathSection.hidden = true;
    neighborsSection.hidden = true;

    currentPaths = [];

    pathSelector.hidden = true;
    graphSolutionSelector.hidden = true;

    if (!word) {
        resultElement.textContent = "Enter a four-letter word.";
        updateGraph([], getNeighbors, selectWord);
        return;
    }

    if (!words.has(word)) {
        resultElement.textContent =
            `${word.toUpperCase()} is not in this dictionary.`;

        updateGraph([], getNeighbors, selectWord);
        return;
    }

    const neighbors = getNeighbors(word);
    displayNeighbors(word);

    if (!distances.has(word)) {
        resultElement.textContent =
            `${word.toUpperCase()} is valid but unreachable from POOP. ` +
            `${neighbors.length} neighboring words.`;

        updateGraph([], getNeighbors, selectWord);
        return;
    }

    const distance = distances.get(word);
    currentPaths = getShortestPaths(word);
    let allPaths = [];

    const requestedSolution = Number(
        new URLSearchParams(window.location.search).get("solution") ?? 1
    );

    const solutionIndex = Number.isInteger(requestedSolution)
        ? requestedSolution - 1
        : 0;
    
    selectSolution(solutionIndex);

    const newCanvasTop = graphCanvas.getBoundingClientRect().top;

    window.scrollBy({
        top: newCanvasTop - previousCanvasTop,
        behavior: "instant"
    });
}

pathIndexInput.addEventListener("input", () => {
    selectSolution(Number(pathIndexInput.value));
});

graphSolutionInput.addEventListener("input", () => {
    selectSolution(Number(graphSolutionInput.value));
});

function selectSolution(index) {
    if (currentPaths.length === 0) return;

    index = Math.max(0, Math.min(Math.floor(index), currentPaths.length - 1));

    const path = currentPaths[index];
    pathIndexInput.max = currentPaths.length - 1;
    graphSolutionInput.max = currentPaths.length - 1;

    const moves = path.length - 1;
    pathHeading.textContent =
        `Shortest path from ${path[0].toUpperCase()} to POOP: ${moves} ` +
        `${moves === 1 ? "move" : "moves"}`;

    // Synchronize both sliders
    pathIndexInput.value = index;
    graphSolutionInput.value = index;

    // Update labels
    pathIndexLabel.textContent =
        `Solution ${index + 1} of ${currentPaths.length}`;

    graphSolutionLabel.textContent =
        `${index + 1} / ${currentPaths.length}`;

    // Show selectors only when multiple solutions exist
    pathSelector.hidden = currentPaths.length <= 1;
    graphSolutionSelector.hidden = currentPaths.length <= 1;
    

    // Update displayed path and graph
    displayPath(path);
    updateGraph(path, getNeighbors, selectWord, currentPaths);

    // Save selection in URL
    updateUrlParameter("solution", index + 1);
}

// Load selected dictionary
async function loadDictionary() {
    const dictionary = dictionarySelect.value;
    updateUrlParameter("dictionary", dictionary);

    const url =
        `./Assets/4-letter-word-lists/fourLetterWords-${dictionary}.json`;

    resultElement.textContent = "";
    pathSection.hidden = true;
    neighborsSection.hidden = true;

    currentPaths = [];

    pathSelector.hidden = true;
    graphSolutionSelector.hidden = true;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        words = new Set(await response.json());

        if (words.has(START_WORD)) {
            calculateDistances(START_WORD);
        } else {
            distances = new Map();
            predecessors = new Map();
        }

        totalWordsElement.textContent = words.size.toLocaleString();
        reachableWordsElement.textContent = distances.size.toLocaleString();

        const percentage =
            words.size > 0 ? distances.size / words.size * 100 : 0;

        reachabilityElement.textContent = `${percentage.toFixed(2)}%`;

        updateSearch();
    } catch (error) {
        words = new Set();
        distances = new Map();
        predecessors = new Map();

        totalWordsElement.textContent = "—";
        reachableWordsElement.textContent = "—";
        reachabilityElement.textContent = "—";

        resultElement.textContent =
            `Failed to load dictionary: ${error.message}`;
    }
}

function selectWord(word) {
    searchInput.value = word.toUpperCase();
    updateSearch();
}

const initialDictionary = urlParams.get("dictionary");
const initialWord = urlParams.get("word");

if (
    initialDictionary &&
    [...dictionarySelect.options].some(
        option => option.value === initialDictionary
    )
) {
    dictionarySelect.value = initialDictionary;
}

dictionarySelect.addEventListener("change", loadDictionary);
searchInput.addEventListener("input", updateSearch);

copyLinkButton.addEventListener("click", async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);

        copyLinkButton.textContent = "Copied!";

        setTimeout(() => {
            copyLinkButton.textContent = "Copy link";
        }, 1500);
    } catch (error) {
        console.error("Failed to copy link:", error);
    }
});

// Restore the last searched word, prioritizing the URL
const savedWord = localStorage.getItem("lastSearchedWord");

searchInput.value = initialWord && /^[a-z]{4}$/i.test(initialWord)
    ? initialWord.toLowerCase()
    : savedWord || "";

loadDictionary();