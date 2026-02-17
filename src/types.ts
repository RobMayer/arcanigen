import { DetailedHTMLProps, HTMLAttributes } from "react";

export type Measure<U extends string> = `${number}${U}`;

export type SVGObject = {
    tag: "g" | "path" | "svg" | "defs" | "marker";
    children: SVGObject[];
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
    preview: { x: number; y: number; w: number; h: number };
};

export type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };
