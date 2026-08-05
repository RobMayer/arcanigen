import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { DataTypes, NodeDefinitions, NodeTypes } from "../../definitions/betterTypes";
import type { SubgraphDeps } from "../../util/cycleDetection";
import type { Flavour } from "../../components/types";
import type { CustomIconKey } from "../../components/Icon";

export type SubgraphMeta = { name: string; flavour: Flavour; category: NodeTypes.Category; icon: CustomIconKey };

export const makeSubgraphMeta = (name: string, overrides?: Partial<SubgraphMeta>): SubgraphMeta => ({
    name,
    flavour: NodeTypes.DEFAULT_CUSTOM_FLAVOUR,
    category: "Custom",
    icon: "default",
    ...overrides,
});

export type GraphId = string;
export type SocketId = string;
export type XY = { x: number; y: number };

export type CacheType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: { [cacheKey: string]: DataTypes.AnyEval | null } } };
export type NodesType = { [graphId: GraphId]: { [nodeId: ArcaneGraph.NodeId]: NodeDefinitions.NodeFor<NodeDefinitions.Any> } };
export type MetaType = { [graphId: GraphId]: SubgraphMeta };
export type LinksType = { [graphId: GraphId]: { [linkId: ArcaneGraph.LinkId]: ArcaneGraph.Link } };
export type InterfaceSocket = `in:${string}` | `out:${string}`;
export type InterfaceSeparator = { type: "separator" };
export type InterfaceAccordion = { type: "accordion"; id: string; label: string; items: Exclude<InterfaceMember, InterfaceAccordion>[] };
export type InterfaceMember = InterfaceSocket | InterfaceSeparator | InterfaceAccordion;

export const flattenSockets = (members: InterfaceMember[]): InterfaceSocket[] =>
    members.flatMap((m) => (typeof m === "string" ? [m] : m.type === "accordion" ? flattenSockets(m.items as InterfaceMember[]) : []));

/** Display label for an interface node: its user-set label, or the node type's displayName ("Angle Input") when unset. */
export const interfaceMemberLabel = (node: { type: string; payload: Record<string, unknown> }): string => {
    const label = node.payload.label;
    if (typeof label === "string" && label !== "") return label;
    return NodeTypes.get(node.type as NodeTypes.Key).displayName;
};

export const parseInterface = (entry: InterfaceSocket): { direction: "in" | "out"; nodeId: string } => {
    if (entry.startsWith("in:")) return { direction: "in", nodeId: entry.slice(3) };
    return { direction: "out", nodeId: entry.slice(4) };
};

export type InterfacesType = { [graphId: GraphId]: InterfaceMember[] };
export type DepsType = { [graphId: GraphId]: SubgraphDeps };
export type UsersType = { [graphId: GraphId]: { node: string; scope: string }[] };
