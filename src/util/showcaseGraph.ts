import { NodeDefinitions, NodeTypes } from "../definitions/nodeTypes";
import { Registries } from "../definitions/nodeRegistry";
import { makeSubgraphMeta } from "../state/project/types";
import type { Project } from "../state/project";

// Builds a throwaway "showcase" project: one unconnected instance of every node type, laid out in a
// per-category grid so their layouts can be perused. Dev-only (see the toolbar button). Inputs/Outputs
// and the Custom node are skipped; the Result node is the required singleton terminal, so it gets its
// canonical id + interface entry rather than a generated one.

const SKIP_CATEGORIES = new Set<string>(["Inputs", "Outputs", "Custom", "Meta"]);

// Canvas-space grid spacing. Heights vary wildly (knot/colorSplit are tall), so the row pitch is generous.
const COLS = 12;
const CELL_W = 400;
const CELL_H = 620;
const HEADER_DROP = 160; // header note -> first node row
const BAND_GAP = 200; // gap after a category band
const START_X = 0;

const RESULT_ID = "RESULT";

type ShowNode = NodeDefinitions.NodeFor<NodeDefinitions.Any>;

export const buildShowcaseProject = (version: number): Project.SavedProject => {
    const nodes: Record<string, ShowNode> = {};
    const positions: Record<string, { x: number; y: number }> = {};

    // create() over the type union has no single callable signature and returns a specific built node;
    // widen the param and the result to the union built-node so one call site type-checks.
    const make = (type: NodeTypes.Any, id: string): ShowNode => type.create({} as Partial<NodeDefinitions.PayloadTypeOf<NodeDefinitions.Any>>, id) as unknown as ShowNode;

    let y = 0;

    for (const category of Registries.NODE_CATEGORIES) {
        if (SKIP_CATEGORIES.has(category)) continue;

        const types = NodeTypes.list().filter((t) => t.category === category);
        if (types.length === 0) continue;

        // Category header, as a Notes node planted at the top-left of the band.
        const headerId = `HEADER_${category.replace(/\s+/g, "_")}`;
        nodes[headerId] = NodeTypes.get("notes").create({ text: `== ${category} ==` }, headerId) as unknown as ShowNode;
        positions[headerId] = { x: START_X, y };

        const bandTop = y + HEADER_DROP;
        types.forEach((type, i) => {
            const id = type.type === "result" ? RESULT_ID : `SHOW_${type.type}`;
            nodes[id] = make(type, id);
            positions[id] = { x: START_X + (i % COLS) * CELL_W, y: bandTop + Math.floor(i / COLS) * CELL_H };
        });

        const rows = Math.ceil(types.length / COLS);
        y = bandTop + rows * CELL_H + BAND_GAP;
    }

    return {
        version,
        nodes: { root: nodes },
        links: { root: {} },
        positions: { root: positions },
        users: { root: [] },
        interfaces: { root: [`out:${RESULT_ID}`] },
        meta: { root: makeSubgraphMeta("Root") },
    };
};
