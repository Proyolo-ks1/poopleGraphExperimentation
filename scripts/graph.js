import { buildGraphData } from "./graph-builder.js";
import { calculateLayout } from "./graph-layout.js";
import { calculateNodeColors } from "./graph-colors.js";
import { drawGraph } from "./graph-renderer.js";
import {canvas, getCanvasSize, resizeCanvas} from "./canvas-helper.js";
import { setupGraphControls } from "./graph-controls.js";
import {
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

        renderGraph();
    }
}


// Center the graph in the canvas
function resetView() {
    if (!graphNodes.length) {
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        renderGraph();
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

    renderGraph();
}

// Public function called from script.js
export function updateGraph(path, getNeighbors, selectWord) {
    currentPath = path;
    getNeighborsFunction = getNeighbors;
    onSelectWord = selectWord;

    buildGraph(false);
}

function handleResize() {
    resizeCanvas();
    renderGraph();
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

function initGraphControls(){
    setupGraphControls({
        canvas,
        depthSlider,
        depthValue,
        resetButton,
        buildGraph,
        resetView,
        handleResize,
        renderGraph,
        findNodeAt,
        rememberNodePosition,
        getOnSelectWord: () => onSelectWord,
        getCamera: () => ({ scale, offsetX, offsetY }),
        setCamera: camera => {
            scale = camera.scale;
            offsetX = camera.offsetX;
            offsetY = camera.offsetY;
        }
    });
}


// init
initGraphControls();
handleResize();
buildGraph(true);