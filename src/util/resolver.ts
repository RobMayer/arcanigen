import { Shape } from "../definitions/shapeTypes";
import { NodeDefinitions } from "../definitions/nodeTypes";
import { DataTypes } from "../definitions/dataTypes";

export namespace Resolver {
    export namespace EnumMappings {
        export const strokeCap = ["butt", "square", "round"] as const;
        export const strokeJoin = ["miter", "bevel", "round"] as const;
        export const paintOrder = ["fill stroke markers", "fill markers stroke", "stroke fill markers", "stroke markers fill", "markers fill stroke", "markers stroke fill"] as const;
        export const linearAlign = ["start", "middle", "end"] as const;
        export const gradientSpread = ["pad", "reflect", "repeat"] as const;
        export const textAnchor = ["hanging", "central", "auto"] as const;
        export const blendMode = [
            "normal",
            "multiply",
            "screen",
            "overlay",
            "darken",
            "lighten",
            "color-dodge",
            "color-burn",
            "hard-light",
            "soft-light",
            "difference",
            "exclusion",
            "hue",
            "saturation",
            "color",
            "luminosity",
            "plus-lighter",
        ] as const;
    }

    /**
     * Cursor position (current index) per active iterating sender, keyed by senderId.
     * The shared iteration substrate for index-driven buses (sequence, loopFor) — the
     * concept distinction lives at the datatype layer, not here. Buses whose injection
     * is not an index (e.g. a future portal carrying a family's values) get their own channel.
     *
     * ASSUMES each node emits at most ONE iteration bus (one sequence OR one loopFor). The key
     * is a bare senderId (a node's id), so two buses from the same node would collide on it.
     * True for the whole corpus today. If a multi-emitter node ever appears, the likely fix is a
     * compound key (e.g. `${nodeId}:${outputSocket}`). senderId is already a free-form string --
     * customNode compounds it at the subgraph boundary (`${node.id}/${innerSenderId}`) -- BUT that
     * only shows a compound key works within one namespace. A per-output compound key would have to
     * survive translateInward/translateOutward's `${customNodeId}/` prefixing across subgraph
     * boundaries, and that composition is UNPROVEN -- prove it before relying on this escape hatch.
     */
    export type CursorData = Readonly<Record<string, number>>;

    /** Strip `{customNodeId}/` prefix from matching cursorData keys when entering a subgraph. */
    export const translateInward = (parentCursorData: CursorData, customNodeId: string): { innerCursorData: CursorData; strippedKeys: Set<string> } => {
        const result: Record<string, number> = {};
        const strippedKeys = new Set<string>();
        const prefix = `${customNodeId}/`;
        for (const [key, value] of Object.entries(parentCursorData)) {
            if (key.startsWith(prefix)) {
                const innerKey = key.slice(prefix.length);
                result[innerKey] = value;
                strippedKeys.add(innerKey);
            } else {
                result[key] = value; // passthrough
            }
        }
        return { innerCursorData: result, strippedKeys };
    };

    /** Re-add `{customNodeId}/` prefix to inner-generated keys when calling back to the parent graph. */
    export const translateOutward = (innerCursorData: CursorData, strippedKeys: Set<string>, customNodeId: string, originalParentCursorData: CursorData): CursorData => {
        const result: Record<string, number> = { ...originalParentCursorData };
        const prefix = `${customNodeId}/`;
        for (const [key, value] of Object.entries(innerCursorData)) {
            if (strippedKeys.has(key)) {
                // Was stripped from a prefixed parent key — re-add prefix
                result[`${prefix}${key}`] = value;
            } else if (key in originalParentCursorData) {
                // Passthrough key — update value
                result[key] = value;
            } else {
                // Generated inside subgraph — add prefix
                result[`${prefix}${key}`] = value;
            }
        }
        return result;
    };

    export type Context = {
        graphId: string;
        cursorData: CursorData;
        resolve: <K extends DataTypes.Kind = DataTypes.ConcreteKind>(nodeId: string, inSocket: string, cursorData?: CursorData) => DataTypes.EvalOf<K> | null;
        subgraph: (
            graphId: string,
            outputNodeId: string,
            resolveInput: (inputNodeId: string, cursorData: CursorData) => DataTypes.AnyEval | null,
            innerCursorData: CursorData,
        ) => DataTypes.AnyEval | null;
        /** For Input nodes: retrieves the value provided by the parent Custom node. Undefined when editing a subgraph directly. */
        getInput?: <K extends DataTypes.Kind = DataTypes.ConcreteKind>(inputNodeId: string) => DataTypes.EvalOf<K> | undefined;
        /** Look up a node by graphId and nodeId */
        getNode: (graphId: string, nodeId: string) => NodeDefinitions.NodeFor<NodeDefinitions.Any> | undefined;
    };

    export type RootResult = {
        canvas: {
            width: number;
            height: number;
            originX: number;
            originY: number;
            background: string;
        };
        contents: Shape | null;
    };
}
