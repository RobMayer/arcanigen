import { NodeType } from "./nodes/abstractNode";
import { CircleNodeType } from "./nodes/shapes/circleNode";
import { ResultNodeType } from "./nodes/resultNode";
import { FloatPrimitiveType } from "./nodes/primitives/floatNode";

export namespace NodeTypeRegistry {
    const NODETYPE_REGISTRY = {
        result: ResultNodeType,
        circle: CircleNodeType,
        float: FloatPrimitiveType,
    } as const;

    export const get = (key: string): NodeType => {
        return NODETYPE_REGISTRY[key as keyof typeof NODETYPE_REGISTRY] as NodeType;
    };

    export type Types = keyof typeof NODETYPE_REGISTRY;

    export const list = () => Object.entries(NODETYPE_REGISTRY);
    export const keys = () => Object.keys(NODETYPE_REGISTRY);
    export const entries = () => Object.entries(NODETYPE_REGISTRY);

    export type NodeTypeBy<K extends keyof typeof NODETYPE_REGISTRY> = (typeof NODETYPE_REGISTRY)[K];
}
