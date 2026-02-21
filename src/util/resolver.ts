import { Shape } from "../definitions/shapeTypes";
import { ArcaneGraph } from "./structs/arcaneGraph";
import { Length } from "../definitions/datatypes/length";
import { DataTypes, NodeDefinitions, NodeTypes } from "../definitions/betterTypes";
import { Color } from "../definitions/datatypes/color";
import { InterfaceMember, flattenSockets, parseInterface } from "../state/project/types";

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

    type GraphId = string;
    export type State = {
        nodes: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
        links: { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
        users: { [graphId: GraphId]: { node: ArcaneGraph.NodeId; scope: GraphId }[] };
        interfaces: { [graphId: GraphId]: InterfaceMember[] };
    };

    export type SequenceData = Readonly<Record<string, number>>;

    export type Context = {
        graphId: string;
        sequenceData: SequenceData;
        resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string, sequenceData?: SequenceData) => DataTypes.EvalOf<DataTypes.Use<K>> | null;
        subgraph: (graphId: string, inputs: { [key: string]: DataTypes.AnyEval | null }) => { [key: string]: DataTypes.AnyEval | null };
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

    const EMPTY_SEQ: SequenceData = {};

    export const evaluateRootResult = (state: State): RootResult => {
        const resolve = makeResolve(state, "root", EMPTY_SEQ);

        // Get the RESULT node directly and resolve its inputs
        const resultNode = state.nodes["root"]?.["RESULT"] as unknown as NodeDefinitions.NodeFor<NodeTypes.DefinitionOf<NodeTypes.Use<"result">>>;
        if (!resultNode) {
            return {
                canvas: { width: 800, height: 800, originX: 0, originY: 0, background: Color.toHex({ r: 1, g: 1, b: 1, a: 1 }) },
                contents: null,
            };
        }

        // Resolve canvas settings from result node (use connected values or fall back to payload)
        const width = Length.Emptyable.asNumber(resolve<"length">("RESULT", "w")?.data ?? resultNode.payload.w ?? "800px") ?? 800;
        const height = Length.Emptyable.asNumber(resolve<"length">("RESULT", "h")?.data ?? resultNode.payload.h ?? "800px") ?? 800;
        const originX = Length.Emptyable.asNumber(resolve<"length">("RESULT", "x")?.data ?? resultNode.payload.x ?? "0px") ?? 0;
        const originY = Length.Emptyable.asNumber(resolve<"length">("RESULT", "y")?.data ?? resultNode.payload.y ?? "0px") ?? 0;
        const backgroundColor = resolve<"color">("RESULT", "color")?.data ?? resultNode.payload.color;
        const background = backgroundColor === null ? "none" : Color.toHex(backgroundColor);

        // Resolve the shape input
        const shapeEval = resolve<"shape">("RESULT", "input");
        const contents = shapeEval?.data ?? null;

        return {
            canvas: { width, height, originX: width / 2 + originX, originY: height / 2 + originY, background },
            contents,
        };
    };

    /** Creates a resolve function for a given graph and sequenceData */
    const makeResolve = (
        state: State,
        graphId: GraphId,
        sequenceData: SequenceData,
        getInput?: <K extends DataTypes.Kind>(inputNodeId: string) => DataTypes.EvalOf<DataTypes.Use<K>> | undefined,
    ): Context["resolve"] => {
        const graphNodes = state.nodes[graphId];
        const graphLinks = state.links[graphId];

        return <K extends DataTypes.Kind>(nodeId: string, inSocket: string, overrideSeqData?: SequenceData): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
            const effectiveSeqData = overrideSeqData ?? sequenceData;
            const links = ArcaneGraph.linksTo({ nodes: graphNodes, links: graphLinks }, nodeId, inSocket);
            if (links.length === 0) return null;
            const theLink = graphLinks?.[links[0]];
            if (!theLink) return null;
            return evaluateNodeOutput<K>(state, graphId, theLink.fromNode, theLink.fromSocket, effectiveSeqData, getInput);
        };
    };

    /** Evaluates a single node output, creating a per-call context with the correct sequenceData */
    const evaluateNodeOutput = <K extends DataTypes.Kind>(
        state: State,
        graphId: GraphId,
        nodeId: ArcaneGraph.NodeId,
        outSocket: string,
        sequenceData: SequenceData,
        getInput?: <K2 extends DataTypes.Kind>(inputNodeId: string) => DataTypes.EvalOf<DataTypes.Use<K2>> | undefined,
    ): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
        const node = state.nodes[graphId]?.[nodeId];
        if (!node) return null;

        const evaluate = NodeTypes.getEvaluator(node.type);
        if (!evaluate) return null;

        const context: Context = {
            graphId,
            sequenceData,
            resolve: makeResolve(state, graphId, sequenceData, getInput),
            subgraph: (subgraphId: string, inputs: { [key: string]: DataTypes.AnyEval | null }) => {
                return evaluateSubgraph(state, subgraphId, inputs, sequenceData);
            },
            getInput,
            getNode: (gId: string, nId: string) => state.nodes[gId]?.[nId],
        };

        return evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], context) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
    };

    const evaluateSubgraph = (
        state: State,
        subgraphId: GraphId,
        inputs: { [key: string]: DataTypes.AnyEval | null },
        sequenceData: SequenceData,
    ): { [key: string]: DataTypes.AnyEval | null } => {
        const subgraphNodes = state.nodes[subgraphId];
        const subgraphLinks = state.links[subgraphId];
        if (!subgraphNodes || !subgraphLinks) return {};

        const getInput = <K extends DataTypes.Kind>(inputNodeId: string): DataTypes.EvalOf<DataTypes.Use<K>> | undefined => {
            return inputs[inputNodeId] as DataTypes.EvalOf<DataTypes.Use<K>> | undefined;
        };

        const resolve = makeResolve(state, subgraphId, sequenceData, getInput);

        // Get output node IDs by parsing interfaces with "out:" prefix
        const subgraphSockets = flattenSockets(state.interfaces[subgraphId] ?? []);
        const results: { [key: string]: DataTypes.AnyEval | null } = {};

        for (const entry of subgraphSockets) {
            const parsed = parseInterface(entry);
            if (parsed.direction !== "out") continue;

            const outputNodeId = parsed.nodeId;
            const outputNode = subgraphNodes[outputNodeId];
            if (!outputNode) continue;

            // Resolve the "input" socket of the output node
            const resolved = resolve(outputNodeId, "input");
            results[outputNodeId] = resolved;
        }

        return results;
    };
}
