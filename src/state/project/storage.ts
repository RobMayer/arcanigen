import { NodeTypes } from "../../definitions/betterTypes";
import { computeSubgraphDeps } from "../../util/cycleDetection";
import type { NodesType, LinksType, InterfacesType, DepsType, UsersType } from "./types";
import { makeSubgraphMeta } from "./types";
import { buildInitialCache } from "./cache";

const STARTING_STATE = {
    root: {
        meta: makeSubgraphMeta("Root"),
        uses: [] as { node: string; target: string }[],
        nodes: {
            RESULT: {
                ...NodeTypes.get("result").create({}, "RESULT"),
                in: { input: "LAYERS_TO_RESULT", w: null, h: null, x: null, y: null, color: null },
            },
            NOTE: {
                ...NodeTypes.get("notes").create(
                    {
                        text: "Middle-click and drag (or hold down space and left-click and drag) to navigate the viewport. \n\n Drag a node from the drawer below onto the graph view to add a node (or you can just click on it). \n\n Drag a socket to connect it to another socket.",
                    },
                    "NOTE",
                ),
            },
            CIRCLE: {
                ...NodeTypes.get("circle").create({}, "CIRCLE"),
                out: { output: ["CIRCLE_TO_LAYERS"], path: [] },
            },
            LAYERS: {
                ...NodeTypes.get("layers").create({}, "LAYERS"),
                in: { layers: null, isolate: null, layer_LAYER0: "CIRCLE_TO_LAYERS", layer_LAYER1: "POLYGON_TO_LAYERS" },
                out: { output: ["LAYERS_TO_RESULT"], layerCount: [], enabledCount: [] },
                payload: {
                    label: "",
                    isolate: false,
                    layers: [
                        { socket: "layer_LAYER0", enabled: true, blend: 0 },
                        { socket: "layer_LAYER1", enabled: true, blend: 0 },
                    ],
                },
            },
            POLYGON: {
                ...NodeTypes.get("polygon").create({}, "POLYGON"),
                out: { output: ["POLYGON_TO_LAYERS"], path: [], eCircumradius: [], eApothem: [] },
            },
        },
        links: {
            CIRCLE_TO_LAYERS: {
                fromNode: "CIRCLE",
                toNode: "LAYERS",
                fromSocket: "output",
                toSocket: "layer_LAYER0",
                type: "shape",
                id: "CIRCLE_TO_LAYERS",
            },
            LAYERS_TO_RESULT: { fromNode: "LAYERS", toNode: "RESULT", fromSocket: "output", toSocket: "input", type: "shape", id: "LAYERS_TO_RESULT" },
            POLYGON_TO_LAYERS: {
                fromNode: "POLYGON",
                toNode: "LAYERS",
                fromSocket: "output",
                toSocket: "layer_LAYER1",
                type: "shape",
                id: "POLYGON_TO_LAYERS",
            },
        },
        positions: {
            RESULT: { x: 98, y: -33 },
            NOTE: { x: 400, y: -400 },
            CIRCLE: { x: -865, y: -115 },
            LAYERS: { x: -347, y: -34 },
            POLYGON: { x: -849, y: 240.8359375 },
        },
        interfaces: ["out:RESULT"],
    },
};

/** Builds initial deps for all graphs, processing in topological order (inside-out) */
export const buildInitialDeps = (nodes: NodesType, links: LinksType, interfaces: InterfacesType, users: UsersType): DepsType => {
    const deps: DepsType = {};

    // Build dependency graph from users: scope depends on targetGraphId
    // So we need to process targetGraphId before scope
    const graphDependsOn: { [graphId: string]: Set<string> } = {};
    for (const graphId of Object.keys(nodes)) {
        graphDependsOn[graphId] = new Set();
    }
    for (const [targetGraphId, userList] of Object.entries(users)) {
        for (const { scope } of userList) {
            if (graphDependsOn[scope]) {
                graphDependsOn[scope].add(targetGraphId);
            }
        }
    }

    // Topological sort: process graphs whose dependencies have all been processed
    const processed = new Set<string>();
    const toProcess = new Set(Object.keys(nodes));

    while (toProcess.size > 0) {
        let foundOne = false;
        for (const graphId of toProcess) {
            const unprocessedDeps = [...graphDependsOn[graphId]].filter((dep) => !processed.has(dep) && toProcess.has(dep));
            if (unprocessedDeps.length === 0) {
                // All dependencies processed, compute deps for this graph
                const graphInterfaces = interfaces[graphId] ?? [];
                if (graphInterfaces.length > 0) {
                    const graph = { nodes: nodes[graphId], links: links[graphId] };
                    deps[graphId] = computeSubgraphDeps(graph, graphInterfaces, deps);
                }
                processed.add(graphId);
                toProcess.delete(graphId);
                foundOne = true;
                break;
            }
        }
        if (!foundOne) {
            // Circular dependency - process remaining graphs anyway
            for (const graphId of toProcess) {
                const graphInterfaces = interfaces[graphId] ?? [];
                if (graphInterfaces.length > 0) {
                    const graph = { nodes: nodes[graphId], links: links[graphId] };
                    deps[graphId] = computeSubgraphDeps(graph, graphInterfaces, deps);
                }
            }
            break;
        }
    }

    return deps;
};

// Derive initial state from fixture
const nodes = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.nodes])) as NodesType;
const nodeList = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.nodes)]));
const links = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.links])) as LinksType;
const linkList = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.links)]));
const positions = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.positions]));
const users: UsersType = (() => {
    const u: UsersType = Object.fromEntries(Object.keys(STARTING_STATE).map((graphId) => [graphId, []]));
    for (const [scope, g] of Object.entries(STARTING_STATE)) {
        for (const use of g.uses) {
            u[use.target].push({ node: use.node, scope });
        }
    }
    return u;
})();
const interfaces = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.interfaces])) as InterfacesType;
const meta = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.meta]));
const cache = buildInitialCache(nodes, links, interfaces);
const deps = buildInitialDeps(nodes, links, interfaces, users);

export const INITIAL_STATE = { nodes, nodeList, links, linkList, positions, users, interfaces, meta, cache, deps };
