export const ROOTS = Symbol("roots");

export type TreeItemOf<T> = {
    id: string;
    children: string[];
    parent: null | string;
} & T;
export type TreeOf<T> = { [id: string]: TreeItemOf<T>; [ROOTS]: string[] };
export type TreeDataOf<T> = {
    [id: string]: {
        id: string;
        children: string[];
        parent: null | string;
    } & T;
};

const DEFAULT_DISCRIMINATOR_ALWAYS = () => true;
const DEFAULT_PERMITTER_ALWAYS = () => true;

type IdInput = string | string[] | Set<string>;
const normalizeIds = (id: IdInput): string[] => {
    if (typeof id === "string") return [id];
    if (id instanceof Set) return [...id];
    return id;
};

export namespace TreeHelper {
    export const make = <T>(initial: TreeDataOf<T> = {}) => {
        return Object.entries(initial).reduce<TreeOf<T>>(
            (acc, [id, value]) => {
                acc[id] = value;
                if (value.parent === null) {
                    acc[ROOTS].push(id);
                }
                return acc;
            },
            { [ROOTS]: [] },
        );
    };

    export const roots = (data: TreeOf<unknown>) => data[ROOTS];

    // traversal

    export const ancestors = (data: TreeOf<unknown>, id: string) => {
        let current = data[id]?.parent;
        if (current === undefined) {
            return undefined;
        }
        const result: string[] = [];
        while (current !== null && current !== undefined) {
            result.push(current);
            current = data[current]?.parent ?? null;
        }

        return result;
    };

    export const deepDescendants = (data: TreeOf<unknown>, id: string) => {
        const node = data[id];
        if (!node) {
            return undefined;
        }
        const result: string[] = [];
        const traverse = (nodeId: string) => {
            data[nodeId]?.children.forEach((childId) => {
                result.push(childId);
                traverse(childId);
            });
        };
        traverse(id);
        return result;
    };

    export const wideDescendants = (data: TreeOf<unknown>, id: string) => {
        const node = data[id];
        if (!node) {
            return undefined;
        }
        const result: string[] = [];
        const queue = [...node.children];

        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);
            const currentNode = data[current];
            if (currentNode) {
                queue.push(...currentNode.children);
            }
        }

        return result;
    };

    // query

    export const wideFlatten = <T>(data: TreeOf<T>, discriminator: (a: T) => boolean = DEFAULT_DISCRIMINATOR_ALWAYS) => {
        const from = data[ROOTS];

        const res = new Set<string>();
        const traverse = (keys: string[]) => {
            const next: string[] = [];
            keys.forEach((k) => {
                if (discriminator(data[k])) {
                    res.add(k);
                }
                next.push(...data[k].children);
            });
            if (next.length > 0) {
                traverse(next);
            }
        };
        traverse(from);
        return [...res];
    };

    export const deepFlatten = <T>(data: TreeOf<T>, discriminator: (a: T) => boolean = DEFAULT_DISCRIMINATOR_ALWAYS) => {
        const from = data[ROOTS];
        const res = new Set<string>();
        const traverse = (key: string) => {
            if (discriminator(data[key])) {
                res.add(key);
            }
            data[key].children.forEach(traverse);
        };
        from.forEach(traverse);
        return [...res];
    };

    // edit - immutable

    export const toSorted = <T>(data: TreeOf<T>, sorter: (a: [node: TreeItemOf<T>, index: number], b: [node: TreeItemOf<T>, index: number]) => number): TreeOf<T> => {
        const result: TreeOf<T> = { ...data };

        // Sort roots array
        const sortedRoots = [...data[ROOTS]]
            .map((id, index) => [data[id], index] as [TreeItemOf<T>, number])
            .sort(sorter)
            .map(([item]) => item.id);

        result[ROOTS] = sortedRoots;

        // Sort each node's children array (preserves insertion order)
        Object.keys(data).forEach((id) => {
            const item = data[id];
            if (!item || item.children.length === 0) return;

            const sortedChildren = [...item.children]
                .map((childId, index) => [data[childId], index] as [TreeItemOf<T>, number])
                .sort(sorter)
                .map(([child]) => child.id);

            result[id] = {
                ...item,
                children: sortedChildren,
            };
        });

        return result;
    };

    export const toSortedWide = <T>(data: TreeOf<T>, sorter: (a: [node: TreeItemOf<T>, index: number], b: [node: TreeItemOf<T>, index: number]) => number): TreeOf<T> => {
        const result: TreeOf<T> = { ...data };

        // Sort roots
        const sortedRoots = [...data[ROOTS]]
            .map((id, index) => [data[id], index] as [TreeItemOf<T>, number])
            .sort(sorter)
            .map(([item]) => item.id);

        result[ROOTS] = sortedRoots;

        const queue = [...sortedRoots];
        while (queue.length > 0) {
            const id = queue.shift()!;
            const node = data[id];
            if (!node) continue;

            // Sort children and add to queue
            const sortedChildren = node.children
                .map((childId, index) => [data[childId], index] as [TreeItemOf<T>, number])
                .sort(sorter)
                .map(([n]) => n.id);

            // Update node's children array to be sorted
            result[id] = { ...node, children: sortedChildren };

            queue.push(...sortedChildren);
        }

        return result;
    };

    export const toSortedDeep = <T>(data: TreeOf<T>, sorter: (a: [node: TreeItemOf<T>, index: number], b: [node: TreeItemOf<T>, index: number]) => number): TreeOf<T> => {
        const result: TreeOf<T> = { ...data };

        // Sort roots
        const sortedRoots = [...data[ROOTS]]
            .map((id, index) => [data[id], index] as [TreeItemOf<T>, number])
            .sort(sorter)
            .map(([item]) => item.id);

        result[ROOTS] = sortedRoots;

        // Depth-first recursive traversal
        const traverse = (id: string) => {
            const node = data[id];
            if (!node) return;

            // Sort children
            const sortedChildren = node.children
                .map((childId, index) => [data[childId], index] as [TreeItemOf<T>, number])
                .sort(sorter)
                .map(([n]) => n.id);

            // Update node's children array to be sorted
            result[id] = { ...node, children: sortedChildren };

            // Recursively traverse children (depth-first)
            sortedChildren.forEach(traverse);
        };

        // Start traversal from roots
        sortedRoots.forEach(traverse);

        return result;
    };

    export const moveTo = <T>(
        data: TreeOf<T>,
        id: IdInput,
        newParent: string | null,
        before: number,
        permitter: (child: TreeItemOf<T>, newParent: TreeItemOf<T> | null) => boolean = DEFAULT_PERMITTER_ALWAYS,
    ): TreeOf<T> => {
        const result: TreeOf<T> = { ...data };
        const existingParents: { [key: string]: string | null } = {};
        const ids = normalizeIds(id);

        // Cycle prevention: Check if newParent would create a cycle
        if (newParent !== null) {
            // Check if newParent is one of the items being moved (self-parenting)
            if (ids.includes(newParent)) {
                return result; // Would create cycle - no changes
            }

            // Check if newParent is a descendant of any item being moved
            const ancestorsOfNewParent = TreeHelper.ancestors(result, newParent) || [];
            if (ids.some((eachId) => ancestorsOfNewParent.includes(eachId))) {
                return result; // Would create cycle - no changes
            }
        }

        const thingsToMove = ids.filter((each, i, ary) => {
            const curParent = result[each]?.parent;

            // Skip if item doesn't exist
            if (!result[each]) {
                return false;
            }

            if (curParent == null || !ary.includes(curParent)) {
                if (permitter(result[each], newParent === null ? null : result[newParent])) {
                    existingParents[each] = curParent;
                    return true;
                }
            }
            return false;
        });

        thingsToMove.forEach((each) => {
            const oldParent = existingParents[each];
            if (oldParent === null) {
                result[ROOTS] = result[ROOTS].filter((a) => a !== each);
            } else {
                result[oldParent] = {
                    ...result[oldParent],
                    children: result[oldParent].children.filter((a) => a !== each),
                };
            }
            result[each] = {
                ...result[each],
                parent: newParent,
            };
        });

        const target = newParent === null ? result[ROOTS] : result[newParent].children;
        const insertIndex = before < 0 ? Math.max(0, target.length + before) : Math.max(0, Math.min(before, target.length));
        const newChildren = [...target.slice(0, insertIndex), ...thingsToMove, ...target.slice(insertIndex)];

        if (newParent === null) {
            result[ROOTS] = newChildren;
        } else {
            result[newParent] = {
                ...result[newParent],
                children: newChildren,
            };
        }

        return result;
    };

    export const move = <T>(data: TreeOf<T>, id: IdInput, newParent: string | null, permitter: (child: TreeItemOf<T>, newParent: TreeItemOf<T> | null) => boolean = DEFAULT_PERMITTER_ALWAYS) => {
        return moveTo(data, id, newParent, Infinity, permitter);
    };
}
