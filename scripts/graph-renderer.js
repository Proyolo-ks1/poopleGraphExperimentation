import {getCanvasSize} from "./canvas-helper.js";
import {
    FIRST_GENERATION_Y,
    GENERATION_SPACING_Y
} from "./graph-config.js";


function drawGenerationBands(ctx, width, height, offsetY, scale, maxDepth) {
    const bandColors = [
        "rgba(110, 145, 190, 0.045)",
        "rgba(110, 145, 190, 0.085)"
    ];

    ctx.save();

    for (let generation = 1; generation <= maxDepth; generation++) {
        const centerDistance =
            FIRST_GENERATION_Y +
            (generation - 1) * GENERATION_SPACING_Y;

        const halfHeight = GENERATION_SPACING_Y / 2;

        for (const side of [-1, 1]) {
            const centerY = offsetY + side * centerDistance * scale;
            const bandHeight = GENERATION_SPACING_Y * scale;

            ctx.fillStyle = bandColors[generation % 2];
            ctx.fillRect(
                0,
                centerY - bandHeight / 2,
                width,
                bandHeight
            );
        }
    }

    ctx.restore();
}

function drawGenerationLabels(ctx, height, offsetY, scale, maxDepth) {
    ctx.save();

    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#aab5c3";

    for (let generation = 0; generation <= maxDepth; generation++) {
        const distance = generation === 0
            ? 0
            : FIRST_GENERATION_Y +
              (generation - 1) * GENERATION_SPACING_Y;

        for (const side of generation === 0 ? [1] : [-1, 1]) {
            const screenY = offsetY + side * distance * scale;

            if (screenY < 0 || screenY > height) continue;

            ctx.fillText(
                `Gen ${generation}`,
                12,
                screenY
            );
        }
    }

    ctx.restore();
}

// Draw all graph elements
export function drawGraph(
    ctx,
    offsetX,
    offsetY,
    scale,
    graphLegs,
    graphNodes,
    graphEdges,
    currentPath,
    NODE_RADIUS
) {
    const graphPath = new Set(currentPath);
    const pathEdges = new Set();

    for (let i = 0; i < currentPath.length - 1; i++) {
        pathEdges.add(
            [currentPath[i], currentPath[i + 1]].sort().join(":")
        );
    }

    const { width, height } = getCanvasSize();

    ctx.clearRect(0, 0, width, height);

    if (!graphNodes.length) return;

    const maxDepth = Math.max(0, ...graphNodes.map(node => node.depth));

    drawGenerationBands(
        ctx,
        width,
        height,
        offsetY,
        scale,
        maxDepth
    );

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const nodeMap = new Map(
        graphNodes.map(node => [node.word, node])
    );

    // Draw L.E.G. frames behind all edges and nodes.
    const legColors = ["#6c9cc6", "#6fb5a2", "#b1a36b", "#b58dbd"];
    for (const leg of graphLegs) {
        const color = legColors[leg.letter];
        ctx.beginPath();
        ctx.roundRect(leg.x, leg.y, leg.width, leg.height, 12);
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.085;
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 0.85;
        ctx.font = "11px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = color;
        ctx.fillText(`L.E.G. ${leg.letter + 1}`, leg.x + 10, leg.y + 6);
    }
    ctx.globalAlpha = 1;

    // Draw connections
    for (const edge of graphEdges) {
        const from = nodeMap.get(edge.from);
        const to = nodeMap.get(edge.to);

        const isPathEdge = pathEdges.has(
            [edge.from, edge.to].sort().join(":")
        );

        const isParentEdge =
            from.parent === to.word ||
            to.parent === from.word;
        const shared = from.depth === 0 ? to : to.depth === 0 ? from : null;
        const backbone = from.depth === 0 ? from : to.depth === 0 ? to : null;
        const sharedGroup = shared && graphLegs.find(leg =>
            leg.type === "segment" && shared.depth === 1 &&
            shared.x >= leg.x && shared.x <= leg.x + leg.width &&
            (backbone.anchor === leg.anchor || backbone.anchor === leg.anchor + 1)
        );

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);

        if (isPathEdge) {
            // Shortest path backbone
            ctx.strokeStyle = "#c58b57";
            ctx.lineWidth = 3;
            ctx.globalAlpha = 1;
        } else if (sharedGroup) {
            ctx.strokeStyle = "#83929e";
            ctx.lineWidth = 1.4;
            ctx.globalAlpha = 0.65;
        } else if (isParentEdge) {
            // Branch connection to the discovering word
            ctx.strokeStyle = "#667383";
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.7;
        } else {
            // Additional connections between displayed words
            ctx.strokeStyle = "#48505c";
            ctx.lineWidth = 0.7;
            ctx.globalAlpha = 0.15;
        }

        ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw nodes on top of edges
    for (const node of graphNodes) {
        const isTarget = node.word === "poop";
        const isPath = graphPath.has(node.word);

        ctx.beginPath();
        ctx.arc(
            node.x,
            node.y,
            NODE_RADIUS,
            0,
            Math.PI * 2
        );

        if (isTarget) {
            // Keep POOP's special brown appearance
            ctx.fillStyle = "#67432c";
            ctx.strokeStyle = "#e2aa76";
        } else {
            ctx.fillStyle = node.fillColor;
            ctx.strokeStyle = node.strokeColor;
        }

        ctx.lineWidth = isPath ? 2.5 : 1.5;
        ctx.fill();
        ctx.stroke();

        // Labels
        ctx.fillStyle = "#f0f0f0";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText(
            node.word.toUpperCase(),
            node.x,
            node.y
        );
    }

    ctx.restore();

    drawGenerationLabels(ctx, height, offsetY, scale, maxDepth)
}