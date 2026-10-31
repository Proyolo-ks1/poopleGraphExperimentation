import {
    LEG_NODE_SPACING,
    LEG_MARGIN,
    FIRST_GENERATION_Y,
    GENERATION_SPACING_Y
} from "./graph-config.js";

export function getGenerationY(generation, side) {
    if (generation === 0) return 0;

    return side * (
        FIRST_GENERATION_Y +
        (generation - 1) * GENERATION_SPACING_Y
    );
}



export function calculateLayout(graphNodes, currentPath) {
    // Build L.E.G.s from actual letter substitutions. Shared alternatives
    // between consecutive backbone words always belong to their segment.

    const graphLegs = [];
    const groups = new Map();
    const groupOf = new Map();
    const pathCount = currentPath.length;

    function changedLetter(a, b) {
        let changed = -1;
        for (let i = 0; i < 4; i++) {
            if (a[i] !== b[i]) {
                if (changed !== -1) return -1;
                changed = i;
            }
        }
        return changed;
    }

    function addToGroup(key, type, anchor, letter, info, segment = -1) {
        if (!groups.has(key)) {
            groups.set(key, {
                key, type, anchor, letter, segment,
                words: [], levels: new Map(), side: 0, centerX: 0
            });
        }
        const group = groups.get(key);
        group.words.push(info);
        groupOf.set(info.word, group);
    }

    // First generation: determine membership independently of BFS order.
    for (const info of graphNodes) {
        if (info.depth !== 1) continue;
        let sharedSegment = -1;
        let sharedLetter = -1;
        for (let i = 0; i < pathCount - 1; i++) {
            const letter = changedLetter(currentPath[i], currentPath[i + 1]);
            if (letter >= 0 &&
                changedLetter(info.word, currentPath[i]) === letter &&
                changedLetter(info.word, currentPath[i + 1]) === letter) {
                sharedSegment = i;
                sharedLetter = letter;
                break;
            }
        }
        if (sharedSegment >= 0) {
            addToGroup(`segment:${sharedSegment}`, "segment",
                sharedSegment, sharedLetter, info, sharedSegment);
        } else {
            // A word may neighbor several backbone nodes. Choose the first
            // eligible anchor deterministically, not its BFS discovery order.
            let anchor = info.anchor;
            let letter = changedLetter(info.word, currentPath[anchor]);
            for (let i = 0; i < pathCount; i++) {
                const candidate = changedLetter(info.word, currentPath[i]);
                if (candidate >= 0) {
                    anchor = i;
                    letter = candidate;
                    break;
                }
            }
            addToGroup(`anchor:${anchor}:${letter}`, "anchor",
                anchor, letter, info);
        }
    }

    // Later generations inherit the L.E.G. of their first-generation ancestor.
    for (const info of graphNodes) {
        if (info.depth < 2) continue;
        const parentGroup = groupOf.get(info.parent);
        if (!parentGroup) continue;
        groupOf.set(info.word, parentGroup);
        if (!parentGroup.levels.has(info.depth)) {
            parentGroup.levels.set(info.depth, []);
        }
        parentGroup.levels.get(info.depth).push(info);
    }

    for (const group of groups.values()) {
        group.words.sort((a, b) => a.word.localeCompare(b.word));
        for (const level of group.levels.values()) {
            level.sort((a, b) => a.word.localeCompare(b.word));
        }
        group.width = Math.max(
            1, group.words.length,
            ...Array.from(group.levels.values(), level => level.length)
        ) * LEG_NODE_SPACING + LEG_MARGIN;
    }

    // Allocate a separate horizontal region for each backbone node and each
    // shared segment. Regions are sized using their widest generation.
    const anchorGroups = Array.from({ length: pathCount }, () => []);
    const segmentGroups = Array.from({ length: Math.max(0, pathCount - 1) }, () => null);
    for (const group of groups.values()) {
        if (group.type === "segment") segmentGroups[group.segment] = group;
        else anchorGroups[group.anchor].push(group);
    }

    for (let i = 0; i < pathCount; i++) {
        const ordered = anchorGroups[i].sort((a, b) => a.letter - b.letter);
        // The remaining letter groups use top, bottom and an outer lane.
        // Endpoints may use the outer lane as their free left/right group.
        ordered.forEach((group, index) => {
            group.side = index === 0 ? -1 : 1;
            group.horizontal = index >= 2;
        });
    }

    const anchorWidths = anchorGroups.map(list =>
        Math.max(155, ...list.map(group => group.width))
    );
    const segmentWidths = segmentGroups.map(group =>
        Math.max(110, group ? group.width : 0)
    );
    const anchorXs = [anchorWidths[0] / 2];
    const segmentXs = [];
    for (let i = 0; i < pathCount - 1; i++) {
        segmentXs.push(anchorXs[i] + anchorWidths[i] / 2 + segmentWidths[i] / 2);
        anchorXs.push(anchorXs[i] + anchorWidths[i] / 2 +
            segmentWidths[i] + anchorWidths[i + 1] / 2);
    }

    for (const info of graphNodes) {
        if (info.depth === 0) {
            info.x = anchorXs[info.anchor];
            info.y = 0;
        }
    }

    // One horizontal row per generation, with room reserved in advance.
    function placeRow(items, centerX, y) {
        items.forEach((info, index) => {
            info.x = centerX + (index - (items.length - 1) / 2) * LEG_NODE_SPACING;
            info.y = y;
        });
    }

    for (const group of groups.values()) {
        const isSegment = group.type === "segment";

        const side = isSegment ? 1 : group.side;

        let centerX = isSegment
            ? segmentXs[group.segment]
            : anchorXs[group.anchor];

        if (!isSegment && group.horizontal) {
            if (group.anchor === 0) {
                centerX -= anchorWidths[0] / 2 + group.width / 2;
            } else if (group.anchor === pathCount - 1) {
                centerX += anchorWidths[group.anchor] / 2 + group.width / 2;
            }
        }

        group.centerX = centerX;

        placeRow(
            group.words,
            centerX,
            getGenerationY(1, side)
        );

        for (const [generation, items] of group.levels) {
            placeRow(
                items,
                centerX,
                getGenerationY(generation, side)
            );
        }

        const frameWidth = Math.max(
            82,
            (group.words.length - 1) * LEG_NODE_SPACING + 68
        );

        const baseY = getGenerationY(1, side);

        graphLegs.push({
            x: centerX - frameWidth / 2,
            y: baseY - 40,
            width: frameWidth,
            height: 80,
            letter: group.letter,
            anchor: group.anchor,
            type: group.type
        });
    }

    return graphLegs;
}