import { BinaryComparisonDefinition, createBinaryComparisonNode } from "./comparisonUtils";

export type LessOrEqualDefinition = BinaryComparisonDefinition;

export const LessOrEqualNodeType = createBinaryComparisonNode({
    type: "lessOrEqual",
    displayName: "Less or Equal",
    defaultLabel: "Less or Equal",
    compare: (a, b) => a <= b,
});
