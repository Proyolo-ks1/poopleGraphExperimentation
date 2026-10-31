export function buildGraphData(currentPath, getNeighbors, maxNodes, depth) {
    const graphNodes = [];
    const graphEdges = [];
    const graphPath = new Set(currentPath);

    if (!currentPath.length || !getNeighbors) {
        return {
            graphNodes,
            graphEdges,
            graphPath,
            capped: false
        };
    }

    // Each discovered word stores its distance from the backbone
    // and which backbone word it belongs to.
    const discovered = new Map();
    const queue = [];

    currentPath.forEach((word, index) => {
        discovered.set(word, {
            word,
            depth: 0,
            anchor: index
        });

        queue.push(word);
    });

    // Multi-source BFS expanding from the entire shortest path
    for (let index = 0; index < queue.length; index++) {
        const word = queue[index];
        const info = discovered.get(word);

        if (info.depth >= depth) continue;

        for (const neighbor of getNeighbors(word)) {
            if (discovered.has(neighbor)) continue;
            if (discovered.size >= maxNodes) break;

            discovered.set(neighbor, {
                word: neighbor,
                depth: info.depth + 1,
                anchor: info.anchor,
                parent: word
            });

            queue.push(neighbor);
        }
    }

    // Build every edge between displayed words
    const displayed = new Set(discovered.keys());
    const addedEdges = new Set();

    for (const node of discovered.values()) {
        for (const neighbor of getNeighbors(node.word)) {
            if (!displayed.has(neighbor)) continue;

            const pair = [node.word, neighbor].sort();
            const key = pair.join(":");

            if (addedEdges.has(key)) continue;

            addedEdges.add(key);

            graphEdges.push({
                from: node.word,
                to: neighbor
            });
        }
    }

    return {
        graphNodes: Array.from(discovered.values()),
        graphEdges,
        graphPath,
        capped: discovered.size >= maxNodes
    };
}