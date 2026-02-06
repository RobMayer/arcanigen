export namespace Enum {
    type Base = { [k: string]: number }

    export const options = <O extends Base>(o: O) => Object.keys({ ...o });
    export const resolve = <O extends Base>(n: number, o: O) => Math.max(0, Math.min(n, Object.keys(o).length - 1));

    export namespace Common {
        export const strokeCap = {
            Butt: 0,
            Square: 1,
            Round: 2,
        } as const;

        export const positionMode = {
            Cartesian: 0,
            Polar: 1,
        }
    }
}
