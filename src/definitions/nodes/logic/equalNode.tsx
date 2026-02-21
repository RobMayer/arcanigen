import { BinaryComparisonDefinition, createBinaryComparisonNode } from "./comparisonUtils";

export type EqualDefinition = BinaryComparisonDefinition;

export const EqualNodeType = createBinaryComparisonNode({
    type: "equal",
    displayName: "Equal",
    defaultLabel: "Equal",
    compare: (a, b) => a === b,
});
