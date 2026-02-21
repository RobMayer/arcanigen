import { BinaryComparisonDefinition, createBinaryComparisonNode } from "./comparisonUtils";

export type GreaterThanDefinition = BinaryComparisonDefinition;

export const GreaterThanNodeType = createBinaryComparisonNode({
    type: "greaterThan",
    displayName: "Greater Than",
    defaultLabel: "Greater Than",
    compare: (a, b) => a > b,
});
