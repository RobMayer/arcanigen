import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataTypes, NodeDefinitions } from "../../definitions/betterTypes";
import { SubgraphDeps } from "../../util/cycleDetection";

export type GraphId = string;
export type SocketId = string;
export type XY = { x: number; y: number };

export type CacheType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [outSocket: SocketId]: DataTypes.AnyEval } } };
export type NodesType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
export type LinksType = { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
export type InterfacesType = { [graphId: GraphId]: string[] }; // prefixed with "in:" or "out:"
export type DepsType = { [graphId: GraphId]: SubgraphDeps };
export type UsersType = { [graphId: GraphId]: { node: string; scope: string }[] };
