import { NodeType } from "./nodes/abstractNode";
import { CircleNodeType } from "./nodes/circleNode";
import { ResultNodeType } from "./nodes/resultNode";

export namespace NodeTypeRegistry {
    const NODETYPE_REGISTRY = {
        result: ResultNodeType,
        circle: CircleNodeType,
    } as const;

    export const get = (key: string): NodeType => {
        return NODETYPE_REGISTRY[key as keyof typeof NODETYPE_REGISTRY] as NodeType;
    };

    export type Types = keyof typeof NODETYPE_REGISTRY;
}
