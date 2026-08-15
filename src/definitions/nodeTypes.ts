import { ReactNode } from "react";
import { SocketTypes } from "./socketTypes";
import { DataTypes } from "./dataTypes";
import { ArcaneGraph } from "../util/structs/arcaneGraph";
import { Resolver } from "../util/resolver";
import { SubgraphDeps } from "../util/cycleDetection";
import { Flavour } from "../components/types";
import { InterfaceMember, SocketTypeCacheEntry } from "../state/project/types";
import { Registries } from "./nodeRegistry";
import type { Project } from "../state/project";

export type AllDeps = { [graphId: string]: SubgraphDeps };

export namespace NodeDefinitions {
    export type Any = Registries.NODEDEFINITIONS[keyof Registries.NODEDEFINITIONS];

    export type Generic = {
        inputs: Record<string, DataTypes.Kind>;
        outputs: Record<string, DataTypes.Kind>;
        payload: Record<string, unknown>;
    };

    // Base definition requiring a label in payload
    export type Base = {
        inputs: Record<string, DataTypes.Kind>;
        outputs: Record<string, DataTypes.Kind>;
        payload: {
            label: string;
        };
    };

    export type PayloadTypeOf<D extends Generic> = { [K in keyof D["payload"]]: D["payload"][K] };

    export type NodeFor<D extends Generic> = ArcaneGraph.NodeOf<PayloadTypeOf<D>>;

    // Built node instance from a definition
    export type BuiltNodeOf<T extends NodeTypes.Key, D extends Generic> = ArcaneGraph.NodeOf<PayloadTypeOf<D>> & {
        type: T;
        in: { [K in keyof D["inputs"]]: string | null };
        out: { [K in keyof D["outputs"]]: string[] };
    };
}

export namespace NodeTypes {
    export type Key = keyof typeof Registries.NODETYPES;

    export type Category = (typeof Registries.NODE_CATEGORIES)[number];

    /** Default/fallback flavour for new Custom (subgraph) nodes. Pre-existing saves are backfilled to "info" by the v5 migration (the historical default). */
    export const DEFAULT_CUSTOM_FLAVOUR: Flavour = "base";

    export type RefreshReason = "constraintAdded" | "constraintRemoved";

    /** Interface for lifecycle hook context — provides state access and mutation operations */
    export interface MethodContext {
        // State reads
        getNode(graphId: string, nodeId: string): NodeDefinitions.NodeFor<NodeDefinitions.Any> | undefined;
        getLink(graphId: string, linkId: string): ArcaneGraph.Link | undefined;
        getNodesForGraph(graphId: string): { [nodeId: string]: NodeDefinitions.NodeFor<NodeDefinitions.Any> };
        getLinksForGraph(graphId: string): { [linkId: string]: ArcaneGraph.Link };
        getInterfaces(graphId: string): InterfaceMember[];
        getUsers(graphId: string): { node: string; scope: string }[];
        // Low-level mutations (no hooks fired)
        setNode(graphId: string, nodeId: string, node: NodeDefinitions.NodeFor<NodeDefinitions.Any>): void;
        setInterfaces(graphId: string, interfaces: InterfaceMember[]): void;
        setUsers(graphId: string, users: { node: string; scope: string }[]): void;
        // Socket-type cache (transient, derived, never persisted) — off-payload home for solved socket types
        readSocketType(graphId: string, nodeId: string, socketId: string, side: "in" | "out"): SocketTypes.Term | undefined;
        getSocketTypes(graphId: string, nodeId: string): SocketTypeCacheEntry | undefined;
        setSocketTypes(graphId: string, nodeId: string, entry: SocketTypeCacheEntry): void;
        clearSocketTypes(graphId: string, nodeId: string): void;
        // High-level operations (fire hooks, rebuild cache)
        connect(graphId: string, fromNode: string, toNode: string, fromSocket: string, toSocket: string): void;
        removeLinks(graphId: string, ...linkIds: string[]): void;
        requestRefresh(graphId: string, nodeId: string, socketId: string, side: "in" | "out", reason: RefreshReason): void;
    }

    export interface Type<T extends Key, D extends NodeDefinitions.Generic = NodeDefinitions.Generic> {
        type: T;
        displayName: string;
        defaultLabel: string;
        iconNode: ReactNode;
        category: Category;
        flavour: Flavour;
        /** Keeps the type loadable for existing saves but hides it from the Add Node drawer. */
        hidden?: boolean;
        /** Disables this node in the root drawer — it may only be added inside a subgraph (e.g. interface in/out nodes). */
        rootRestricted?: boolean;
        create: (input: Partial<NodeDefinitions.PayloadTypeOf<D>>, id?: string) => NodeDefinitions.BuiltNodeOf<T, D>;
        Controls: (props: { node: NodeDefinitions.NodeFor<D>; methods: ReturnType<typeof Project.useNode>[1] }) => ReactNode;
        evaluate: (node: NodeDefinitions.NodeFor<D>, socket: keyof D["outputs"], context: Resolver.Context) => DataTypes.AnyEval | null;
        dependsOn: (node: NodeDefinitions.NodeFor<D>, outSocket: keyof D["outputs"], deps: AllDeps) => (keyof D["inputs"])[];
        contributesTo: (node: NodeDefinitions.NodeFor<D>, inSocket: keyof D["inputs"], deps: AllDeps) => (keyof D["outputs"])[];
        onCreate?: (node: NodeDefinitions.BuiltNodeOf<T, D>, graphId: string, ctx: MethodContext) => void;
        onDelete?: (node: NodeDefinitions.BuiltNodeOf<T, D>, graphId: string, ctx: MethodContext) => void;
        onConnect?: (node: NodeDefinitions.BuiltNodeOf<T, D>, linkId: string, direction: "in" | "out", graphId: string, ctx: MethodContext) => void;
        onDisconnect?: (node: NodeDefinitions.BuiltNodeOf<T, D>, link: ArcaneGraph.Link, direction: "in" | "out", graphId: string, ctx: MethodContext) => void;
        onPayloadChange?: (node: NodeDefinitions.NodeFor<D>, prev: D["payload"], graphId: string, ctx: MethodContext) => void;
        onRefreshRequest?: (node: NodeDefinitions.BuiltNodeOf<T, D>, socketId: string, side: "in" | "out", reason: RefreshReason, graphId: string, ctx: MethodContext) => void;
        canInterject?: (link: ArcaneGraph.Link, graphId: string, ctx: MethodContext) => boolean;
        onInterject?: (node: NodeDefinitions.BuiltNodeOf<T, D>, link: ArcaneGraph.Link, graphId: string, ctx: MethodContext) => void;
        /** Solved-ready type signature (per-socket Terms + var bounds), built by `signatureBuilder`. When set, the engine derives socket types + propagation. */
        signature?: SocketTypes.Instance;
        getSocketType: (node: NodeDefinitions.NodeFor<D>, socketId: string, side: "in" | "out", graphId: string, ctx: MethodContext) => SocketTypes.Term;
        clone?: (node: NodeDefinitions.BuiltNodeOf<T, D>) => NodeDefinitions.BuiltNodeOf<T, D>;
    }

    export const get = <K extends Key>(key: K): (typeof Registries.NODETYPES)[K] => {
        return Registries.NODETYPES[key];
    };

    export const getControls = <K extends Key>(key: K) => {
        return Registries.NODETYPES[key].Controls;
    };

    export const getEvaluator = <K extends Key>(key: K) => {
        return Registries.NODETYPES[key].evaluate;
    };

    export const getSocketType = (node: NodeDefinitions.NodeFor<NodeDefinitions.Any>, socketId: string, side: "in" | "out", graphId: string, ctx: MethodContext): SocketTypes.Term => {
        return (get(node.type).getSocketType as (n: typeof node, s: string, d: "in" | "out", g: string, c: MethodContext) => SocketTypes.Term)(node, socketId, side, graphId, ctx);
    };

    export const list = () => Object.values(Registries.NODETYPES);

    export type Any = (typeof Registries.NODETYPES)[keyof typeof Registries.NODETYPES];
}
