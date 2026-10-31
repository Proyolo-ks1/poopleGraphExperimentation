

// Graph coloring
const START_HUE = 210;       // Blue
const END_HUE = 28;          // Orange/brown (POOP)
const PATH_SATURATION = 65;
const PATH_LIGHTNESS = 38;

const MIN_SATURATION = 0;
const SATURATION_DECAY = 22;

const INFLUENCE_EXPONENT = 3;

// Convert HSL to RGB (0–1)
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    if (s === 0) {
        return [l, l, l];
    }

    const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    const q = l < 0.5
        ? l * (1 + s)
        : l + s - l * s;

    const p = 2 * l - q;

    return [
        hueToRgb(p, q, h + 1 / 3),
        hueToRgb(p, q, h),
        hueToRgb(p, q, h - 1 / 3)
    ];
}

// Convert RGB to OKLab
function rgbToOklab(rgb) {
    const linear = rgb.map(value =>
        value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4
    );

    const [r, g, b] = linear;

    const l = Math.cbrt(
        0.4122214708 * r +
        0.5363325363 * g +
        0.0514459929 * b
    );

    const m = Math.cbrt(
        0.2119034982 * r +
        0.6806995451 * g +
        0.1073969566 * b
    );

    const s = Math.cbrt(
        0.0883024619 * r +
        0.2817188376 * g +
        0.6299787005 * b
    );

    return [
        0.2104542553 * l +
        0.7936177850 * m -
        0.0040720468 * s,

        1.9779984951 * l -
        2.4285922050 * m +
        0.4505937099 * s,

        0.0259040371 * l +
        0.7827717662 * m -
        0.8086757660 * s
    ];
}

// Convert OKLab back to RGB
function oklabToRgb(lab) {
    const [L, a, b] = lab;

    const l = (
        L + 0.3963377774 * a +
        0.2158037573 * b
    ) ** 3;

    const m = (
        L - 0.1055613458 * a -
        0.0638541728 * b
    ) ** 3;

    const s = (
        L - 0.0894841775 * a -
        1.2914855480 * b
    ) ** 3;

    const linear = [
        4.0767416621 * l -
        3.3077115913 * m +
        0.2309699292 * s,

        -1.2684380046 * l +
        2.6097574011 * m -
        0.3413193965 * s,

        -0.0041960863 * l -
        0.7034186147 * m +
        1.7076147010 * s
    ];

    return linear.map(value => {
        const gamma = value <= 0.0031308
            ? 12.92 * value
            : 1.055 * value ** (1 / 2.4) - 0.055;

        return Math.max(0, Math.min(1, gamma));
    });
}

function rgbToCss(rgb) {
    const values = rgb.map(value =>
        Math.round(value * 255)
    );

    return `rgb(${values.join(", ")})`;
}

// COLOR FUNCTIONS
function getPathColor(index, total) {
    const progress = total <= 1
        ? 1
        : index / (total - 1);

    const hue = START_HUE +
        (END_HUE - START_HUE) * progress;

    return {
        h: hue,
        s: PATH_SATURATION,
        l: PATH_LIGHTNESS
    };
}

// Blend multiple OKLab colors using weights
function blendOklabColors(influences) {
    let totalWeight = 0;
    const result = [0, 0, 0];

    for (const influence of influences) {
        const { color, weight } = influence;

        const rgb = hslToRgb(
            color.h,
            color.s,
            color.l
        );

        const lab = rgbToOklab(rgb);

        for (let i = 0; i < 3; i++) {
            result[i] += lab[i] * weight;
        }

        totalWeight += weight;
    }

    if (totalWeight === 0) {
        return [0.3, 0.3, 0.3];
    }

    return oklabToRgb(
        result.map(value => value / totalWeight)
    );
}

export function calculateNodeColors(nodes, path, getNeighbors, depth) {
    const displayedWords = new Set(
        nodes.map(node => node.word)
    );

    // Store distances from each path word
    const influenceDistances = new Map();

    for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
        const startWord = path[pathIndex];

        const distances = new Map([[startWord, 0]]);
        const queue = [startWord];

        for (let index = 0; index < queue.length; index++) {
            const current = queue[index];
            const distance = distances.get(current);

            for (const neighbor of getNeighbors(current)) {
                if (!displayedWords.has(neighbor)) continue;
                if (distances.has(neighbor)) continue;

                distances.set(neighbor, distance + 1);
                queue.push(neighbor);
            }
        }

        influenceDistances.set(startWord, distances);
    }

    // Calculate the blended color for each node
    for (const node of nodes) {
        // Path nodes retain their own distinct colors
        if (node.depth === 0) {
            const color = getPathColor(
                node.anchor,
                path.length
            );

            node.fillColor = rgbToCss(
                hslToRgb(color.h, color.s, color.l)
            );

            node.strokeColor = rgbToCss(
                hslToRgb(color.h, color.s, 60)
            );

            continue;
        }

        const influences = [];

        for (let pathIndex = 0; pathIndex < path.length; pathIndex++) {
            const pathWord = path[pathIndex];
            const distance =
                influenceDistances.get(pathWord).get(node.word);

            if (distance === undefined || distance === 0) {
                continue;
            }

            // Only consider influences within the chosen depth
            if (distance > depth) {
                continue;
            }

            const weight =
                1 / Math.pow(distance, INFLUENCE_EXPONENT);

            const color = getPathColor(
                pathIndex,
                path.length
            );

            influences.push({
                color,
                weight
            });
        }

        if (influences.length === 0) {
            node.fillColor = "#30343c";
            node.strokeColor = "#626b78";
            continue;
        }

        // Weighted OKLab color blend
        const blendedRgb = blendOklabColors(influences);

        // Saturation decreases with the nearest path distance
        const nearestDistance = Math.min(
            ...Array.from(
                influenceDistances.values(),
                distances => distances.get(node.word) ?? Infinity
            )
        );

        const saturationFactor = Math.max(
            MIN_SATURATION,
            1 - nearestDistance *
                SATURATION_DECAY / PATH_SATURATION
        );

        // Desaturate by blending toward neutral gray
        const gray = [0.23, 0.23, 0.23];

        const finalRgb = blendedRgb.map((value, i) =>
            gray[i] * (1 - saturationFactor) +
            value * saturationFactor
        );

        node.fillColor = rgbToCss(finalRgb);

        node.strokeColor = rgbToCss(
            finalRgb.map(value =>
                Math.min(1, value * 1.5)
            )
        );
    }
}