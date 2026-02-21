import { BinaryComparisonDefinition, createBinaryComparisonNode } from "./comparisonUtils";

export type GreaterOrEqualDefinition = BinaryComparisonDefinition;

export const GreaterOrEqualNodeType = createBinaryComparisonNode({
    type: "greaterOrEqual",
    displayName: "Greater or Equal",
    defaultLabel: "Greater or Equal",
    compare: (a, b) => a >= b,
});
