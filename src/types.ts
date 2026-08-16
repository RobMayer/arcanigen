import { DetailedHTMLProps, HTMLAttributes } from "react";

export type Measure<U extends string> = `${number}${U}`;

export type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };

// Path data type used by textPath, alongPath, etc.
export type SVGPath = {
    d: string;
    transform: string;
};
