export type ListOf<T> = T | T[] | Set<T>;

type NotIterable<T> = T extends readonly unknown[] | Set<unknown> ? never : T;

export const normalizeList = <T>(list: ListOf<NotIterable<T>>): Set<T> => (list instanceof Set ? list : new Set<T>(Array.isArray(list) ? list : [list]));
