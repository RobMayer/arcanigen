import { DetailedHTMLProps, HTMLAttributes } from "react";

export type Measure<U extends string> = `${number}${U}`;

export type SVGObject = {
    tag: "g" | "path" | "line" | "rect" | "svg" | "defs" | "marker";
    children: (SVGObject | null)[];
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
    preview?: { x: number; y: number; w: number; h: number };
};

export type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };

type SVGElement = {
    tag: "g" | "path" | "line" | "rect";
    children?: (SVGElement | null)[];
    style?: { [key: string]: string };
    attributes: { [key: string]: string | undefined };
};

type SVGDefinition = {
    tag: "marker"; // later might include "filter", "mask", etc...
    children?: (SVGElement | SVGDefinition | SVGShape | null)[]; // maybe just SVGElement?
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
};

// top-level element out of a node's output socket - note the forced inclusion of preview, transform, and type.
export type SVGShape = {
    tag: "g" | "path" | "line" | "rect";
    children?: (SVGElement | SVGShape | null)[];
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
    preview: { x: number; y: number; w: number; h: number };
    transform: string; // maybe a string[] instead?
    definitions?: (SVGDefinition | SVGElement)[];
};

// will be used in new datatype: path. used in eventual textPath node, alongPath node, etc.
export type SVGPath = {
    d: string;
    transform: string;
    id: string;
};
