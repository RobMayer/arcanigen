import { Shape } from "../definitions/shapeTypes";
import { DataTypes, NodeDefinitions } from "../definitions/betterTypes";

export namespace Resolver {
    export namespace EnumMappings {
        export const strokeCap = ["butt", "square", "round"] as const;
        export const strokeJoin = ["miter", "bevel", "round"] as const;
        export const paintOrder = ["fill stroke markers", "fill markers stroke", "stroke fill markers", "stroke markers fill", "markers fill stroke", "markers stroke fill"] as const;
        export const textAlign = ["start", "middle", "end"] as const;
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

    export type SequenceData = Readonly<Record<string, number>>;

    /** Strip `{customNodeId}/` prefix from matching seqData keys when entering a subgraph. */
    export const translateInward = (parentSeqData: SequenceData, customNodeId: string): { innerSeqData: SequenceData; strippedKeys: Set<string> } => {
        const result: Record<string, number> = {};
        const strippedKeys = new Set<string>();
        const prefix = `${customNodeId}/`;
        for (const [key, value] of Object.entries(parentSeqData)) {
            if (key.startsWith(prefix)) {
                const innerKey = key.slice(prefix.length);
                result[innerKey] = value;
                strippedKeys.add(innerKey);
            } else {
                result[key] = value; // passthrough
            }
        }
        return { innerSeqData: result, strippedKeys };
    };

    /** Re-add `{customNodeId}/` prefix to inner-generated keys when calling back to the parent graph. */
    export const translateOutward = (
        innerSeqData: SequenceData,
        strippedKeys: Set<string>,
        customNodeId: string,
        originalParentSeqData: SequenceData,
    ): SequenceData => {
        const result: Record<string, number> = { ...originalParentSeqData };
        const prefix = `${customNodeId}/`;
        for (const [key, value] of Object.entries(innerSeqData)) {
            if (strippedKeys.has(key)) {
                // Was stripped from a prefixed parent key — re-add prefix
                result[`${prefix}${key}`] = value;
            } else if (key in originalParentSeqData) {
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
        sequenceData: SequenceData;
        resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string, sequenceData?: SequenceData) => DataTypes.EvalOf<DataTypes.Use<K>> | null;
        subgraph: (graphId: string, outputNodeId: string, resolveInput: (inputNodeId: string, seqData: SequenceData) => DataTypes.AnyEval | null, innerSeqData: SequenceData) => DataTypes.AnyEval | null;
        /** For Input nodes: retrieves the value provided by the parent Custom node. Undefined when editing a subgraph directly. */
        getInput?: <K extends DataTypes.Kind>(inputNodeId: string) => DataTypes.EvalOf<DataTypes.Use<K>> | undefined;
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
