export namespace Enum {
    export const options = <O extends { [k: string]: number }>(o: O) => Object.keys({ ...o });

    export namespace Common {
        export const strokeCap = {
            Butt: 0,
            Square: 1,
            Round: 2,
        } as const;
    }
}
