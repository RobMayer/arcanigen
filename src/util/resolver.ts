import { NodeTypeRegistry } from "../definitions";
import { DataTypes } from "../definitions/datatypes";
import { AnyDefinition } from "../definitions/nodes/abstractNode";
import { ArcaneGraph } from "./structs/arcaneGraph";

export namespace Resolver {
    type GraphId = string;
    export type State = {
        nodes: { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>> } };
        links: { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
        users: { [graphId: GraphId]: { node: ArcaneGraph.NodeId; scope: GraphId }[] };
        inputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
        outputs: { [graphId: GraphId]: ArcaneGraph.NodeId[] };
    };

    export type Context = {
        graphId: string;
        define: (def: DataTypes.EvaluationBy<"shape">) => void;
        resolve: <K extends DataTypes.Keys>(nodeId: string, inSocket: string) => DataTypes.EvaluationBy<K> | null;
        subgraph: (graphId: string, inputs: { [key: string]: DataTypes.EvaluationBy<DataTypes.Keys> | null }) => { [key: string]: DataTypes.EvaluationBy<DataTypes.Keys> | null };
    };

    export const evaluateRootResult = (state: State) => {
        const definitions: DataTypes.EvaluationBy<"shape">[] = [];

        const define = (def: DataTypes.EvaluationBy<"shape">) => {
            definitions.push(def);
        };

        const context: Context = {
            graphId: "root",
            define,
            resolve: <K extends DataTypes.Keys>(nodeId: string, inSocket: string): DataTypes.EvaluationBy<K> | null => {
                // todo: do the thing

                const links = ArcaneGraph.linksTo({ nodes: state.nodes["root"], links: state.links["root"] }, nodeId, inSocket);
                if (links.length === 0) {
                    return null;
                }
                const theLink = state.links.root?.[links[0]];
                if (!theLink) {
                    return null;
                }

                // do I have the right cardnality here?
                return evaluateNodeOutput<K>(state, "root", theLink.fromNode, theLink.fromSocket, context);
            },
            // todo: work in progress.
            // resolves a subgraph by providing the already-resolved inputs to that subgraph...
            subgraph: (graphId: string, inputs: { [key: string]: DataTypes.EvaluationBy<DataTypes.Keys> | null }): { [key: string]: DataTypes.EvaluationBy<DataTypes.Keys> | null } => {
                //
                return {};
            },
        };

        const contents = evaluateNodeOutput<"shape">(state, "root", "RESULT", "output", context);

        // not sure of this return yet...
        return {
            type: "root",
            definitions,
            contents,
        };
    };

    const evaluateNodeOutput = <K extends DataTypes.Keys>(state: State, graphId: GraphId, nodeId: ArcaneGraph.NodeId, outSocket: string, context: Context): DataTypes.EvaluationBy<K> | null => {
        const node = state.nodes[graphId][nodeId];
        if (!node) {
            return null;
        }
        const nodeType = NodeTypeRegistry.get(node.type);
        if (!nodeType) {
            return null;
        }

        return nodeType.evaluate(node, outSocket, context) as DataTypes.EvaluationBy<K> | null;
    };
}
