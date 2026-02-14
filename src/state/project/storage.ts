import { NodeTypes } from "../../definitions/betterTypes";
import { computeSubgraphDeps } from "../../util/cycleDetection";
import type { NodesType, LinksType, InterfacesType, DepsType, UsersType } from "./types";
import { buildInitialCache } from "./cache";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STARTING_STATE = {
    root: {
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

const TESTING_STATE = {
    root: {
        uses: [{ node: "CUSTOM_A", target: "testSubgraph" }],
        nodes: {
            CUSTOM_A: {
                type: "custom",
                id: "CUSTOM_A",
                in: {
                    inputA: null,
                },
                out: {
                    addResult: [],
                },
                payload: {
                    label: "",
                    graphId: "testSubgraph",
                    value_inputA: "3",
                },
            },
            RESULT: {
                ...NodeTypes.get("result").create({}, "RESULT"),
            },
        },
        links: {},
        positions: {
            RESULT: { x: 0, y: 0 },
            CUSTOM_A: { x: -400, y: 0 },
        },
        interfaces: ["out:RESULT"],
    },
    testSubgraph: {
        uses: [] as { node: string; target: string }[],
        nodes: {
            inputA: {
                id: "inputA",
                type: "floatInput",
                in: {},
                out: {
                    output: ["aToAdder"],
                },
                payload: {
                    label: "A",
                    defaultValue: "1",
                    widget: 1,
                    min: "1",
                    hasMin: true,
                    max: "3",
                    hasMax: false,
                    step: "0.01",
                    hasStep: false,
                },
            },
            adder: {
                id: "adder",
                type: "addFloat",
                in: {
                    a: "aToAdder",
                    b: null,
                },
                out: {
                    output: ["adderToOut"],
                },
                payload: {
                    label: "",
                    a: "1",
                    b: "3",
                },
            },
            addResult: {
                id: "addResult",
                type: "floatOutput",
                in: {
                    input: "adderToOut",
                },
                out: {},
                payload: {
                    label: "Output",
                    widget: 1,
                },
            },
        },
        links: {
            aToAdder: { id: "aToAdder", fromNode: "inputA", fromSocket: "output", toNode: "adder", toSocket: "a", type: "float" },
            adderToOut: { id: "adderToOut", fromNode: "adder", fromSocket: "output", toNode: "addResult", toSocket: "input", type: "float" },
        },
        positions: {
            inputA: { x: -400, y: 0 },
            adder: { x: -200, y: 0 },
            addResult: { x: 0, y: 0 },
        },
        interfaces: ["out:addResult", "in:inputA"],
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
const nodes = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.nodes])) as NodesType;
const nodeList = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.nodes)]));
const links = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.links])) as LinksType;
const linkList = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, Object.keys(g.links)]));
const positions = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.positions]));
const users: UsersType = (() => {
    const u: UsersType = Object.fromEntries(Object.keys(TESTING_STATE).map((graphId) => [graphId, []]));
    for (const [scope, g] of Object.entries(TESTING_STATE)) {
        for (const use of g.uses) {
            u[use.target].push({ node: use.node, scope });
        }
    }
    return u;
})();
const interfaces = Object.fromEntries(Object.entries(TESTING_STATE).map(([graphId, g]) => [graphId, g.interfaces])) as InterfacesType;
const cache = buildInitialCache(nodes, links, interfaces);
const deps = buildInitialDeps(nodes, links, interfaces, users);

export const INITIAL_STATE = { nodes, nodeList, links, linkList, positions, users, interfaces, cache, deps };
