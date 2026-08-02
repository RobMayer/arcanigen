export namespace Tree {
    type IdList = string | string[] | Set<string>;
    const noramlizeIds = (list: IdList): Set<string> => (list instanceof Set ? list : new Set(Array.isArray(list) ? list : [list]));

    export type NodeId = string;
    export type TreeOf<P> = {
        [id: NodeId]: NodeOf<P>;
    };
    export type NodeOf<P> = {
        id: NodeId;
        parent: null | string;
        children: string[];
        payload: P;
    };
    export type PayloadOf<T> = T extends TreeOf<infer P> ? P : never;

    const DEFAULT_DISCRIMINATOR_ALWAYS = () => true;
    const DEFAULT_PERMITTER_ALWAYS = () => true;

    //#region query

    export const has = <T>(tree: TreeOf<T>, id: NodeId) => id in tree;

    export const roots = <T>(tree: TreeOf<T>): NodeId[] => Object.keys(tree).filter((id) => tree[id].parent === null);

    export const ancestorsOf = <T>(tree: TreeOf<T>, target: NodeId): NodeId[] => {
        let current = tree[target]?.parent;
        const result: NodeId[] = [];
        while (current !== null) {
            result.push(current);
            current = tree[current]?.parent ?? null;
        }
        return result;
    };

    export const deepDescendentsOf = <T>(tree: TreeOf<T>, target: NodeId): NodeId[] => {
        const result: string[] = [];
        const traverse = (nodeId: string) => {
            tree[nodeId]?.children.forEach((childId) => {
                result.push(childId);
                traverse(childId);
            });
        };
        traverse(target);
        return result;
    };

    export const wideDescendentsOf = <T>(tree: TreeOf<T>, target: NodeId): NodeId[] => {
        const result: string[] = [];
        const queue = [...tree[target].children];
        while (queue.length > 0) {
            const current = queue.shift()!;
            result.push(current);
            const currentNode = tree[current];
            if (currentNode) {
                queue.push(...currentNode.children);
            }
        }
        return result;
    };

    //#endregion

    export const deepFlatten = <T>(data: TreeOf<T>, discriminator: (a: NodeOf<T>) => boolean = DEFAULT_DISCRIMINATOR_ALWAYS) => {
        const from = Tree.roots(data);
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

    export const wideFlatten = <T>(data: TreeOf<T>, discriminator: (a: NodeOf<T>) => boolean = DEFAULT_DISCRIMINATOR_ALWAYS) => {
        const from = Tree.roots(data);
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

    //#region modification

    export const add = <T>(tree: TreeOf<T>, payload: T, parent: NodeId  , id: NodeId = ""): [tree: TreeOf<T>, newId: NodeId | null] => {
        if (parent !== null && !Tree.has(tree, parent)) {
            return [tree, null];
        }
        return [
            {
                ...tree,
                ...(parent === null
                    ? {}
                    : {
                          [parent]: {
                              ...tree.parent,
                              children: [...tree.parent.children, id],
                          },
                      }),
                [id]: {
                    id,
                    parent,
                    children: [],
                    payload,
                },
            },
            id,
        ];
    };

    export const moveTo = <T>(
        tree: TreeOf<T>,
        id: IdList,
        newParent: NodeId | null,
        before: number,
        permitter: (child: NodeOf<T>, newParent: NodeOf<T> | null) => boolean = DEFAULT_PERMITTER_ALWAYS,
    ): TreeOf<T> => {
        const result: TreeOf<T> = { ...tree };
        const existingParents: { [key: string]: string | null } = {};
        const ids = noramlizeIds(id);

        // Cycle prevention: Check if newParent would create a cycle
        if (newParent !== null) {
            // Check if newParent is one of the items being moved (self-parenting)
            if (ids.has(newParent)) {
                return result; // Would create cycle - no changes
            }

            // Check if newParent is a descendant of any item being moved
            const ancestorsOfNewParent = Tree.ancestorsOf(result, newParent) || [];
            if ([...ids].some((eachId) => ancestorsOfNewParent.includes(eachId))) {
                return result; // Would create cycle - no changes
            }
        }

        const thingsToMove = [...ids].filter((each, i, ary) => {
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
                // result[ROOTS] = result[ROOTS].filter((a) => a !== each);
            } else {
                (result as TreeOf<unknown>)[oldParent] = {
                    ...result[oldParent],
                    children: result[oldParent].children.filter((a) => a !== each),
                };
            }
            (result as TreeOf<unknown>)[each] = {
                ...result[each],
                parent: newParent,
            };
        });

        if (newParent !== null) {
            const target = result[newParent].children;
            const insertIndex = before < 0 ? Math.max(0, target.length + before) : Math.max(0, Math.min(before, target.length));
            const newChildren = [...target.slice(0, insertIndex), ...thingsToMove, ...target.slice(insertIndex)];
            (result as TreeOf<unknown>)[newParent] = {
                ...result[newParent],
                children: newChildren,
            };
        }

        return result;
    };

    export const move = <T>(tree: TreeOf<T>, target: IdList, newParent: NodeId | null, permitter: (child: NodeOf<T>, newParent: NodeOf<T> | null) => boolean = DEFAULT_PERMITTER_ALWAYS): TreeOf<T> => {
        return moveTo(tree, target, newParent, Infinity, permitter);
    };

    //#endregion
}
