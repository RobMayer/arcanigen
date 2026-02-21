import { BinaryComparisonDefinition, createBinaryComparisonNode } from "./comparisonUtils";

export type LessThanDefinition = BinaryComparisonDefinition;

export const LessThanNodeType = createBinaryComparisonNode({
    type: "lessThan",
    displayName: "Less Than",
    defaultLabel: "Less Than",
    compare: (a, b) => a < b,
});
