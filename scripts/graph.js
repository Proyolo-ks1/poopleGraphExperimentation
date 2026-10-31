import { buildGraphData } from "./graph-builder.js";
import { calculateLayout } from "./graph-layout.js";
import { calculateNodeColors } from "./graph-colors.js";
import { drawGraph } from "./graph-renderer.js";
import {canvas, getCanvasSize, resizeCanvas} from "./canvas-helper.js";
import {
    MIN_ZOOM,
    MAX_ZOOM,
    ZOOM_SENSITIVITY,
    MAX_NODES,
    NODE_RADIUS,
    DEFAULT_FIT_MAX_ZOOM
} from "./graph-config.js";


const ctx = canvas.getContext("2d");


// elements
const depthSlider = document.getElementById("graph-depth");
const depthValue = document.getElementById("graph-depth-value");
depthValue.textContent = depthSlider.value;

const graphStats = document.getElementById("graph-stats");
const resetButton = document.getElementById("graph-reset");

// other stuff?
let graphNodes = [];
let graphEdges = [];
let graphLegs = [];
let graphPath = new Set();

let pendingFocus = null;

let currentPath = [];
let getNeighborsFunction = null;
let onSelectWord = null;

let scale = 1;
let offsetX = 0;
let offsetY = 0;

let pointerDown = null;
let dragging = false;

function rememberNodePosition(word) {
    const node = graphNodes.find(node => node.word === word);

    if (!node) {
        pendingFocus = null;
        return;
    }

    pendingFocus = {
        word,
        screenX: node.x * scale + offsetX,
        screenY: node.y * scale + offsetY
    };
}

function buildGraph(resetCamera = false) {
    const depth = Number(depthSlider.value);

    const data = buildGraphData(
        currentPath,
        getNeighborsFunction,
        MAX_NODES,
        depth
    );

    graphNodes = data.graphNodes;
    graphEdges = data.graphEdges;
    graphPath = data.graphPath;

    graphLegs = calculateLayout(
        graphNodes,
        currentPath
    );

    calculateNodeColors(
        graphNodes,
        currentPath,
        getNeighborsFunction,
        depth
    );

    graphStats.textContent =
        `${graphNodes.length} nodes · ${graphEdges.length} edges` +
        (data.capped ? ` · Limited to ${MAX_NODES} nodes` : "");

    if (resetCamera) {
        resetView();
    } else {
        if (pendingFocus) {
    const node = graphNodes.find(
        node => node.word === pendingFocus.word
    );

    if (node) {
        offsetX = pendingFocus.screenX - node.x * scale;
        offsetY = pendingFocus.screenY - node.y * scale;
    }

    pendingFocus = null;
}

renderGraph();;
    }
}


// Center the graph in the canvas
function resetView() {
    if (!graphNodes.length) {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        renderGraph(ctx, offsetX, offsetY, scale, graphLegs, graphNodes);
        return;
    }

    const { width, height } = getCanvasSize();

    const xs = graphNodes.map(node => node.x);
    const ys = graphNodes.map(node => node.y);

    const minX = Math.min(...xs, ...graphLegs.map(g => g.x)) - 60;
    const maxX = Math.max(...xs, ...graphLegs.map(g => g.x + g.width)) + 60;
    const minY = Math.min(...ys, ...graphLegs.map(g => g.y)) - 60;
    const maxY = Math.max(...ys, ...graphLegs.map(g => g.y + g.height)) + 60;

    const graphWidth = Math.max(maxX - minX, 1);
    const graphHeight = Math.max(maxY - minY, 1);

    scale = Math.min(
        width / graphWidth,
        height / graphHeight,
        DEFAULT_FIT_MAX_ZOOM
    );

    scale = Math.max(scale, 0.05);

    offsetX = width / 2 - (minX + maxX) / 2 * scale;
    offsetY = height / 2 - (minY + maxY) / 2 * scale;

    renderGraph(ctx, offsetX, offsetY, scale, graphLegs, graphNodes);
}

// Check whether an edge belongs to the shortest path
function areConsecutivePathWords(a, b) {
    for (let i = 0; i < currentPath.length - 1; i++) {
        if (
            (currentPath[i] === a && currentPath[i + 1] === b) ||
            (currentPath[i] === b && currentPath[i + 1] === a)
        ) {
            return true;
        }
    }

    return false;
}

// Convert screen coordinates to graph coordinates
function screenToGraph(x, y) {
    return {
        x: (x - offsetX) / scale,
        y: (y - offsetY) / scale
    };
}

// Find the node underneath the pointer
function findNodeAt(x, y) {
    const point = screenToGraph(x, y);

    for (let i = graphNodes.length - 1; i >= 0; i--) {
        const node = graphNodes[i];

        const distance = Math.hypot(
            point.x - node.x,
            point.y - node.y
        );

        if (distance <= NODE_RADIUS) {
            return node;
        }
    }

    return null;
}

function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

// Pan and click
canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;

    const point = getPointerPosition(event);

    pointerDown = point;
    dragging = false;

    canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
    const point = getPointerPosition(event);

    if (pointerDown) {
        const dx = point.x - pointerDown.x;
        const dy = point.y - pointerDown.y;

        if (Math.hypot(dx, dy) > 3) {
            dragging = true;
        }

        if (dragging) {
            offsetX += dx;
            offsetY += dy;
            renderGraph(ctx, offsetX, offsetY, scale, graphLegs, graphNodes);
        }

        pointerDown = point;
    } else {
        const node = findNodeAt(point.x, point.y);
        canvas.style.cursor = node ? "pointer" : "grab";
    }
});

canvas.addEventListener("pointerup", event => {
    if (!pointerDown) return;

    const point = getPointerPosition(event);

    if (!dragging) {
        const node = findNodeAt(point.x, point.y);

        if (node && onSelectWord) {
            rememberNodePosition(node.word);
            onSelectWord(node.word);
        }
    }

    pointerDown = null;
    dragging = false;
});

canvas.addEventListener("pointercancel", () => {
    pointerDown = null;
    dragging = false;
});

// Zoom around the mouse pointer
canvas.addEventListener("wheel", event => {
    event.preventDefault();

    const point = getPointerPosition(event);
    const before = screenToGraph(point.x, point.y);

    const factor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
    scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale * factor));

    offsetX = point.x - before.x * scale;
    offsetY = point.y - before.y * scale;

    renderGraph(ctx, offsetX, offsetY, scale, graphLegs, graphNodes);
}, { passive: false });

// Slider
depthSlider.addEventListener("input", () => {
    depthValue.textContent = depthSlider.value;
    buildGraph(false);
    const url = new URL(window.location.href);
    url.searchParams.set("graphNeighbors", depthSlider.value);
    window.history.replaceState(null, "", url);
});

const params = new URLSearchParams(window.location.search);
const requestedDepth = Number(params.get("graphNeighbors"));

if (
    params.has("graphNeighbors") &&
    Number.isInteger(requestedDepth) &&
    requestedDepth >= Number(depthSlider.min) &&
    requestedDepth <= Number(depthSlider.max)
) {
    depthSlider.value = requestedDepth;
}

depthValue.textContent = depthSlider.value;

resetButton.addEventListener("click", resetView);

window.addEventListener("resize", handleResize);

// Public function called from script.js
export function updateGraph(path, getNeighbors, selectWord) {
    currentPath = path;
    getNeighborsFunction = getNeighbors;
    onSelectWord = selectWord;

    buildGraph(false);
}

function handleResize() {
    resizeCanvas();
    renderGraph(ctx, offsetX, offsetY, scale, graphLegs, graphNodes);
}

// DrawGraph Wrapper
function renderGraph() {
    drawGraph(
        ctx,
        offsetX,
        offsetY,
        scale,
        graphLegs,
        graphNodes,
        graphEdges,
        currentPath,
        NODE_RADIUS
    );
}

// init
handleResize()
buildGraph(true);