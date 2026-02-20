import { NodeTypes } from "../../definitions/betterTypes";
import { computeSubgraphDeps } from "../../util/cycleDetection";
import type { NodesType, LinksType, InterfacesType, DepsType, UsersType, MetaType } from "./types";
import { buildInitialCache } from "./cache";

const STARTING_STATE = {
    root: {
        meta: {
            name: "Root",
        },
        uses: [] as { node: string; target: string }[],
        nodes: {
            RESULT: {
                ...NodeTypes.get("result").create({}, "RESULT"),
            },
        },
        links: {},
        positions: {
            RESULT: { x: 0, y: 0 },
        },
        interfaces: ["out:RESULT"],
    },
};

/** Builds initial deps for all graphs, processing in topological order (inside-out) */
const buildInitialDeps = (nodes: NodesType, links: LinksType, interfaces: InterfacesType, users: UsersType): DepsType => {
    const deps: DepsType = {};

    // Build dependency graph from users: scope depends on targetGraphId
    // So we need to process targetGraphId before scope
    const graphDependsOn: { [graphId: string]: Set<string> } = {};
    for (const graphId of Object.keys(nodes)) {
        graphDependsOn[graphId] = new Set();
    }
    for (const [targetGraphId, userList] of Object.entries(users)) {
        for (const { scope } of userList) {
            // scope depends on targetGraphId
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
const meta = Object.fromEntries(Object.entries(STARTING_STATE).map(([graphId, g]) => [graphId, g.meta])) as MetaType;
const cache = buildInitialCache(nodes, links, interfaces);
const deps = buildInitialDeps(nodes, links, interfaces, users);

export const INITIAL_STATE = { nodes, nodeList, links, linkList, positions, users, interfaces, meta, cache, deps };
