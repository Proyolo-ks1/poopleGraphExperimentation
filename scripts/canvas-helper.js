export const canvas = document.getElementById("graph-canvas");
export const ctx = canvas.getContext("2d");

// Canvas dimensions in CSS pixels
export function getCanvasSize() {
    return {
        width: canvas.clientWidth,
        height: canvas.clientHeight
    };
}

// Resize the canvas for sharp rendering
export function resizeCanvas() {
    const { width, height } = getCanvasSize();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}