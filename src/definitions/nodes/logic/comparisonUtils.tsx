import { DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { constrainForPartner } from "../math/numericMath";

// --- Shared Definition ---

export type BinaryComparisonDefinition = {
    inputs: {
        a: DataTypes.Use<"float">;
        b: DataTypes.Use<"float">;
    };
    outputs: {
        output: DataTypes.Use<"boolean">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        connectedTypeA: SocketTypes.SocketRule;
        connectedTypeB: SocketTypes.SocketRule;
    };
};

// --- Helpers ---

/** Compute the effective type for an input socket given its connected type and the partner's connected type */
export const effectiveInputType = (connectedType: SocketTypes.SocketRule, partnerType: SocketTypes.SocketRule): SocketTypes.SocketRule => {
    if (connectedType.types.length > 0) return connectedType;
    return constrainForPartner(partnerType);
};

export const setPayload = (nodeId: string, updates: Partial<BinaryComparisonDefinition["payload"]>, graphId: string, ctx: NodeTypes.MethodContext): void => {
    const current = ctx.getNode(graphId, nodeId);
    if (!current) return;
    ctx.setNode(graphId, nodeId, {
        ...current,
        payload: { ...current.payload, ...updates } as NodeDefinitions.NodeFor<NodeDefinitions.Any>["payload"],
    });
};
