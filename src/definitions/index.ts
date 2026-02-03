import { CircleNodeType } from "./nodes/circleNode";
import { ResultNodeType } from "./nodes/resultNode";

export const NODETYPE_REGISTRY = {
    result: ResultNodeType,
    circle: CircleNodeType,
} as const;

export type NodeType = (typeof NODETYPE_REGISTRY)[keyof typeof NODETYPE_REGISTRY];
