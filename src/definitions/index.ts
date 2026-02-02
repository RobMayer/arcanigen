import { ResultNodeType } from "./nodes/resultNode";
import { PayloadOf } from "./nodes/types";

export const NODETYPE_REGISTRY = {
    result: ResultNodeType,
} as const;

export type NodeType = (typeof NODETYPE_REGISTRY)[keyof typeof NODETYPE_REGISTRY];
