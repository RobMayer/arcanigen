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
     * Cursor position (current index) per active iterating bus, keyed by `cursorKey` (below).
     * The shared iteration substrate for index-driven buses (sequence, loopFor) — the
     * concept distinction lives at the datatype layer, not here. Buses whose injection
     * is not an index (e.g. a future portal carrying a family's values) get their own channel.
     *
     * The key is `${senderId}:${outputSocket}`, NOT a bare senderId -- so a single node can emit
     * MULTIPLE concurrent buses (e.g. a Grid layout's per-slot / per-row / per-column sequences)
     * without them colliding. `senderId` stays a real node id (Filter still summons a loop-start's
     * `each` via `resolveOutput(senderId, ...)`); `outputSocket` is the disambiguator. The two
     * components are orthogonal to translateInward/translateOutward's `${customNodeId}/` prefixing:
     * customNode prefixes the senderId (`${node.id}/${innerSenderId}`), the translators strip/re-add
     * that `/` prefix, and the `:outputSocket` suffix rides along untouched -- so the key composes
     * cleanly across subgraph boundaries. Keys are opaque (never parsed back apart); senderId (a
     * nanoid, `/`-compounded) can't contain `:`, and socket ids are plain identifiers, so the key
     * is injective.
     */
    export type CursorData = Readonly<Record<string, number>>;

    /** The `CursorData` key for an iteration bus (sequence / loopFor). Distinct output sockets on the
     *  SAME node get distinct keys, letting one node emit multiple concurrent buses without collision. */
    export const cursorKey = (bus: { senderId: string; outputSocket: string }): string => `${bus.senderId}:${bus.outputSocket}`;

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
        /** Evaluate a specific node's OUTPUT socket directly by id (not via a wire). Loop Ends use this to
         *  summon the paired ForEach's `each` by the bus's senderId at a chosen cursor -- Filter re-fetches
         *  the surviving elements this way, since there is no wire from ForEach.each to Filter. */
        resolveOutput: <K extends DataTypes.Kind = DataTypes.ConcreteKind>(nodeId: string, outSocket: string, cursorData?: CursorData) => DataTypes.EvalOf<K> | null;
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
