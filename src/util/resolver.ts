import { SVGObject } from "../types";
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
        inputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        outputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
    };

    export type Context = {
        graphId: string;
        define: (def: DataTypes.EvalOf<DataTypes.Use<"shape">>) => void;
        resolve: <K extends DataTypes.Kind>(nodeId: string, inSocket: string) => DataTypes.EvalOf<DataTypes.Use<K>> | null;
        subgraph: (graphId: string, inputs: { [key: string]: DataTypes.AnyEval | null }) => { [key: string]: DataTypes.AnyEval | null };
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
            // todo: work in progress.
            // resolves a subgraph by providing the already-resolved inputs to that subgraph...
            subgraph: (graphId: string, inputs: { [key: string]: DataTypes.AnyEval | null }): { [key: string]: DataTypes.AnyEval | null } => {
                return {};
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
        const background = context.resolve<"color">("RESULT", "color")?.data ?? resultNode.payload.color;

        // Resolve the shape input
        const shapeEval = context.resolve<"shape">("RESULT", "input");
        const contents = shapeEval?.data ?? null;

        return {
            canvas: { width, height, originX: width / 2 + originX, originY: height / 2 + originY, background },
            definitions,
            contents,
        };
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
