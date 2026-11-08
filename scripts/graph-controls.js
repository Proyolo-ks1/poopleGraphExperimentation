// scripts/graph-controls.js
import {
    MIN_ZOOM,
    MAX_ZOOM,
    ZOOM_SENSITIVITY
} from "./graph-config.js";

export function setupGraphControls({
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
    getOnSelectWord,
    getCamera,
    setCamera
}) {
    let pointerDown = null;
    let dragging = false;

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

        pointerDown = getPointerPosition(event);
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
                const camera = getCamera();

                setCamera({
                    ...camera,
                    offsetX: camera.offsetX + dx,
                    offsetY: camera.offsetY + dy
                });

                renderGraph();
            }

            pointerDown = point;
        } else {
            canvas.style.cursor = findNodeAt(point.x, point.y)
                ? "pointer"
                : "grab";
        }
    });

    canvas.addEventListener("pointerup", event => {
        if (!pointerDown) return;

        const point = getPointerPosition(event);

        if (!dragging) {
            const node = findNodeAt(point.x, point.y);
            const selectWord = getOnSelectWord();

            if (node && selectWord) {
                rememberNodePosition(node.word);
                selectWord(node.word);
            }
        }

        pointerDown = null;
        dragging = false;
    });

    canvas.addEventListener("pointercancel", () => {
        pointerDown = null;
        dragging = false;
    });

    // Zoom around the pointer
    canvas.addEventListener("wheel", event => {
        event.preventDefault();

        const point = getPointerPosition(event);
        const camera = getCamera();

        const graphX = (point.x - camera.offsetX) / camera.scale;
        const graphY = (point.y - camera.offsetY) / camera.scale;

        const factor = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
        const scale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, camera.scale * factor)
        );

        setCamera({
            scale,
            offsetX: point.x - graphX * scale,
            offsetY: point.y - graphY * scale
        });

        renderGraph();
    }, { passive: false });

    // Initialize the depth slider from the URL
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

    depthSlider.addEventListener("input", () => {
        depthValue.textContent = depthSlider.value;
        buildGraph(false);

        const url = new URL(window.location.href);
        url.searchParams.set("graphNeighbors", depthSlider.value);
        window.history.replaceState(null, "", url);
    });

    resetButton.addEventListener("click", resetView);
    window.addEventListener("resize", handleResize);
}