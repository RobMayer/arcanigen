import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataTypes, NodeDefinitions } from "../../definitions/betterTypes";
import type { SubgraphDeps } from "../../util/cycleDetection";

export type GraphId = string;
export type SocketId = string;
export type XY = { x: number; y: number };

export type CacheType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [outSocket: SocketId]: DataTypes.AnyEval } } };
export type NodesType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
export type MetaType = { [graphId: GraphId]: { name: string } };
export type LinksType = { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
export type InterfaceSocket = `in:${string}` | `out:${string}`;
export type InterfaceSeparator = { type: "separator" };
export type InterfaceAccordion = { type: "accordion"; label: string; items: Exclude<InterfaceMember, InterfaceAccordion>[] };
export type InterfaceMember = InterfaceSocket | InterfaceSeparator | InterfaceAccordion;

export const flattenSockets = (members: InterfaceMember[]): InterfaceSocket[] =>
    members.flatMap((m) => (typeof m === "string" ? [m] : m.type === "accordion" ? flattenSockets(m.items as InterfaceMember[]) : []));

export const parseInterface = (entry: InterfaceSocket): { direction: "in" | "out"; nodeId: string } => {
    if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
    return { direction: "out", nodeId: entry.slice(4) };
};

export type InterfacesType = { [graphId: GraphId]: InterfaceMember[] };
export type DepsType = { [graphId: GraphId]: SubgraphDeps };
export type UsersType = { [graphId: GraphId]: { node: string; scope: string }[] };
