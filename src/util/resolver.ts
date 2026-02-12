import { Color, SVGObject } from "../types";
import { ArcaneGraph } from "./structs/arcaneGraph";
import { Length } from "../definitions/datatypes/length";
import { DataTypes, NodeDefinitions, NodeTypes } from "../definitions/betterTypes";

export namespace Resolver {

    export namespace EnumMappings {
        export const strokeCap = ["butt", "square", "round"] as const;
    }

    type GraphId = string;
    export type State = {
        nodes: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
        links: { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
        users: { [graphId: GraphId]: { node: ArcaneGraph.NodeId; scope: GraphId }[] };
        interfaces: { [graphId: GraphId]: string[] }; // prefixed with "in:" or "out:"
    };

    /** Parse an interface entry to get the direction and nodeId */
    const parseInterface = (entry: string): { direction: "in" | "out"; nodeId: string } | null => {
        if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
        if (entry.startsWith("out:")) return { direction: "out", nodeId: entry.slice(4) };
        return null;
    };

    export type Context = {
        graphId: string;
        define: (def: DataTypes.EvalOf<DataTypes.Use<"shape">>) => void;
        resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string) => DataTypes.EvalOf<DataTypes.Use<K>> | null;
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
        definitions: SVGObject[];
        contents: SVGObject | null;
    };

    export const evaluateRootResult = (state: State): RootResult => {
        const definitions: SVGObject[] = [];

        const define = (def: DataTypes.EvalOf<DataTypes.Use<"shape">>) => {
            definitions.push(def.data);
        };

        const context: Context = {
            graphId: "root",
            define,
            getNode: (graphId: string, nodeId: string) => state.nodes[graphId]?.[nodeId],
            resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
                const links = ArcaneGraph.linksTo({ nodes: state.nodes["root"], links: state.links["root"] }, nodeId, inSocket);
                if (links.length === 0) {
                    return null;
                }
                const theLink = state.links.root?.[links[0]];
                if (!theLink) {
                    return null;
                }

                return evaluateNodeOutput<K>(state, "root", theLink.fromNode, theLink.fromSocket, context);
            },
            subgraph: (subgraphId: string, inputs: { [key: string]: DataTypes.AnyEval | null }): { [key: string]: DataTypes.AnyEval | null } => {
                return evaluateSubgraph(state, subgraphId, inputs, define);
            },
        };

        // Get the RESULT node directly and resolve its inputs
        const resultNode = state.nodes["root"]?.["RESULT"] as unknown as NodeDefinitions.NodeFor<NodeTypes.DefinitionOf<NodeTypes.Use<"result">>>;
        if (!resultNode) {
            return {
                canvas: { width: 800, height: 800, originX: 0, originY: 0, background: "#ffffffff" },
                definitions: [],
                contents: null,
            };
        }

        // Resolve canvas settings from result node (use connected values or fall back to payload)
        // Cast payload values since we know this is a result node with specific types
        const width = Length.Emptyable.asNumber(context.resolve<"length">("RESULT", "w")?.data ?? resultNode.payload.w ?? "800px") ?? 800;
        const height = Length.Emptyable.asNumber(context.resolve<"length">("RESULT", "h")?.data ?? resultNode.payload.h ?? "800px") ?? 800;
        const originX = Length.Emptyable.asNumber(context.resolve<"length">("RESULT", "x")?.data ?? resultNode.payload.x ?? "0px") ?? 0;
        const originY = Length.Emptyable.asNumber(context.resolve<"length">("RESULT", "y")?.data ?? resultNode.payload.y ?? "0px") ?? 0;
        const backgroundColor = context.resolve<"color">("RESULT", "color")?.data ?? resultNode.payload.color;
        const background = backgroundColor === null ? "none" : Color.toHex(backgroundColor, true);

        // Resolve the shape input
        const shapeEval = context.resolve<"shape">("RESULT", "input");
        const contents = shapeEval?.data ?? null;

        return {
            canvas: { width, height, originX: width / 2 + originX, originY: height / 2 + originY, background },
            definitions,
            contents,
        };
    };

    const evaluateSubgraph = (
        state: State,
        subgraphId: GraphId,
        inputs: { [key: string]: DataTypes.AnyEval | null },
        define: (def: DataTypes.EvalOf<DataTypes.Use<"shape">>) => void,
    ): { [key: string]: DataTypes.AnyEval | null } => {
        const subgraphNodes = state.nodes[subgraphId];
        const subgraphLinks = state.links[subgraphId];
        if (!subgraphNodes || !subgraphLinks) {
            return {};
        }

        // Create a context for evaluating within the subgraph
        const subContext: Context = {
            graphId: subgraphId,
            define,
            getNode: (graphId: string, nodeId: string) => state.nodes[graphId]?.[nodeId],
            getInput: <K extends DataTypes.Kind>(inputNodeId: string): DataTypes.EvalOf<DataTypes.Use<K>> | undefined => {
                return inputs[inputNodeId] as DataTypes.EvalOf<DataTypes.Use<K>> | undefined;
            },
            resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
                const links = ArcaneGraph.linksTo({ nodes: subgraphNodes, links: subgraphLinks }, nodeId, inSocket);
                if (links.length === 0) {
                    return null;
                }
                const theLink = subgraphLinks[links[0]];
                if (!theLink) {
                    return null;
                }
                return evaluateNodeOutput<K>(state, subgraphId, theLink.fromNode, theLink.fromSocket, subContext);
            },
            subgraph: (nestedGraphId: string, nestedInputs: { [key: string]: DataTypes.AnyEval | null }): { [key: string]: DataTypes.AnyEval | null } => {
                // Recursively evaluate nested subgraphs
                return evaluateSubgraph(state, nestedGraphId, nestedInputs, define);
            },
        };

        // Get output node IDs by parsing interfaces with "out:" prefix
        const subgraphInterfaces = state.interfaces[subgraphId] ?? [];
        const results: { [key: string]: DataTypes.AnyEval | null } = {};

        for (const entry of subgraphInterfaces) {
            const parsed = parseInterface(entry);
            if (!parsed || parsed.direction !== "out") continue;

            const outputNodeId = parsed.nodeId;
            const outputNode = subgraphNodes[outputNodeId];
            if (!outputNode) continue;

            // Resolve the "input" socket of the output node
            const resolved = subContext.resolve(outputNodeId, "input");
            results[outputNodeId] = resolved;
        }

        return results;
    };

    const evaluateNodeOutput = <K extends DataTypes.Kind>(state: State, graphId: GraphId, nodeId: ArcaneGraph.NodeId, outSocket: string, context: Context): DataTypes.EvalOf<DataTypes.Use<K>> | null => {
        const node = state.nodes[graphId][nodeId];
        if (!node) {
            return null;
        }
        const evaluate = NodeTypes.getEvaluator(node.type);
        if (!evaluate) {
            return null;
        }

        return evaluate(node, outSocket as keyof NodeDefinitions.Any["outputs"], context) as DataTypes.EvalOf<DataTypes.Use<K>> | null;
    };
}
