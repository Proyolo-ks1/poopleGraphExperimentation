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
    let touchStart = null;
    let touchMoved = false;
    let multiTouchActive = false;

    let initialTouchCenter = null;
    let initialTouchDistance = 0;
    let initialCamera = null;

    function getPointerPosition(event) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }

    // Pan and click
    canvas.addEventListener("pointerdown", event => {
        if (event.pointerType === "touch") return;
        if (event.button !== 0) return;

        pointerDown = getPointerPosition(event);
        dragging = false;

        canvas.setPointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointermove", event => {
        if (event.pointerType === "touch") return;
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
        if (event.pointerType === "touch") return;
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

    canvas.addEventListener("pointercancel", event => {
        if (event.pointerType === "touch") return;

        pointerDown = null;
        dragging = false;
    });

    // Touchscreen controls
    function getTouchPosition(touch) {
        const rect = canvas.getBoundingClientRect();

        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }

    function getTouchCenter(touches) {
        const a = getTouchPosition(touches[0]);
        const b = getTouchPosition(touches[1]);

        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
    }

    function getTouchDistance(touches) {
        const a = getTouchPosition(touches[0]);
        const b = getTouchPosition(touches[1]);

        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    function selectNodeAt(point) {
        const node = findNodeAt(point.x, point.y);
        const selectWord = getOnSelectWord();

        if (node && selectWord) {
            rememberNodePosition(node.word);
            selectWord(node.word);
        }
    }

    canvas.addEventListener("touchstart", event => {
        if (event.touches.length === 1) {
            touchStart = getTouchPosition(event.touches[0]);
            touchMoved = false;
            multiTouchActive = false;
        } else if (event.touches.length >= 2) {
            touchStart = null;
            multiTouchActive = true;

            initialTouchCenter = getTouchCenter(event.touches);
            initialTouchDistance = getTouchDistance(event.touches);
            initialCamera = getCamera();
        }
    }, { passive: true });


    canvas.addEventListener("touchmove", event => {
        // Single-finger movement: leave scrolling to the browser.
        if (event.touches.length === 1 && !multiTouchActive) {
            const point = getTouchPosition(event.touches[0]);

            if (
                touchStart &&
                Math.hypot(
                    point.x - touchStart.x,
                    point.y - touchStart.y
                ) > 8
            ) {
                touchMoved = true;
            }

            return;
        }

        if (event.touches.length < 2) return;

        // Prevent native scrolling and browser pinch zoom.
        if (event.cancelable) {
            event.preventDefault();
        }

        if (!initialCamera || initialTouchDistance <= 0) return;

        const center = getTouchCenter(event.touches);
        const distance = getTouchDistance(event.touches);

        // Calculate zoom relative to the initial gesture state.
        const factor = distance / initialTouchDistance;

        const scale = Math.max(
            MIN_ZOOM,
            Math.min(MAX_ZOOM, initialCamera.scale * factor)
        );

        // Graph coordinate originally underneath the fingers' midpoint.
        const graphX =
            (initialTouchCenter.x - initialCamera.offsetX) /
            initialCamera.scale;

        const graphY =
            (initialTouchCenter.y - initialCamera.offsetY) /
            initialCamera.scale;

        // Keep that graph coordinate underneath the current midpoint.
        setCamera({
            scale,
            offsetX: center.x - graphX * scale,
            offsetY: center.y - graphY * scale
        });

        renderGraph();
    }, { passive: false });


    canvas.addEventListener("touchend", event => {
        // Only a genuine single-finger tap can select a node.
        if (
            !multiTouchActive &&
            !touchMoved &&
            touchStart &&
            event.changedTouches.length === 1
        ) {
            selectNodeAt(getTouchPosition(event.changedTouches[0]));
        }

        // A two-finger gesture has ended or lost one finger.
        if (event.touches.length < 2) {
            initialTouchCenter = null;
            initialTouchDistance = 0;
            initialCamera = null;
        }

        if (event.touches.length === 0) {
            touchStart = null;
            touchMoved = false;
            multiTouchActive = false;
        }
    }, { passive: true });


    canvas.addEventListener("touchcancel", () => {
        touchStart = null;
        touchMoved = false;
        multiTouchActive = false;

        initialTouchCenter = null;
        initialTouchDistance = 0;
        initialCamera = null;
    });

    // Zoom around the pointer
    // Touchpad scrolling and zoom
    canvas.addEventListener("wheel", event => {
    event.preventDefault();

    const point = getPointerPosition(event);
    const camera = getCamera();

    // Ctrl + wheel is usually a touchpad pinch gesture.
    // A horizontal delta is a strong indication of touchpad scrolling.
    const isPinch = event.ctrlKey;
    const isTouchpadScroll =
        !isPinch &&
        (
            event.deltaX !== 0 ||
            Math.abs(event.deltaY) < 50
        );

    if (isTouchpadScroll) {
        setCamera({
            ...camera,
            offsetX: camera.offsetX - event.deltaX,
            offsetY: camera.offsetY - event.deltaY
        });

        renderGraph();
        return;
    }

    // Zoom around the pointer
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