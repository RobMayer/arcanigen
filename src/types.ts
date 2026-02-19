import { DetailedHTMLProps, HTMLAttributes } from "react";

export type Measure<U extends string> = `${number}${U}`;

export type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };

export type SVGMember = {
    tag: "g" | "path" | "line" | "rect" | "text" | "textPath";
    children?: (SVGMember | null)[];
    text?: string;
    style?: { [key: string]: string };
    attributes: { [key: string]: string | undefined };
};

export type SVGDefinition = {
    tag: "marker"; // later might include "filter", "mask", etc...
    children?: (SVGMember | SVGDefinition | SVGShape | null)[]; // maybe just SVGElement?
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
};

// top-level element out of a node's output socket - note the forced inclusion of preview, transform, and type.
export type SVGShape = {
    tag: "g" | "path" | "line" | "rect" | "text";
    children?: (SVGMember | SVGShape | null)[];
    text?: string;
    attributes: { [key: string]: string | undefined };
    style?: { [key: string]: string };
    preview: { x: number; y: number; w: number; h: number };
    transform: string; // maybe a string[] instead?
    definitions?: (SVGDefinition | SVGMember | null)[];
};

// will be used in new datatype: path. used in eventual textPath node, alongPath node, etc.
export type SVGPath = {
    d: string;
    transform: string;
    preview: { x: number; y: number; w: number; h: number };
};
