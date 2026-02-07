import { Options } from "../../components/types";

export namespace Enum {
    type Base = Record<string, number>;

    export const members = <O extends Base>(o: O) => Object.keys({ ...o });
    export const options = <O extends Base>(o: O): Options<keyof O & string> =>
        Object.keys(o).map((label) => {
            return { value: `${o[label]}`, label };
        });
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
        };
    }
}
