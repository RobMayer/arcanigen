import { DetailedHTMLProps, HTMLAttributes } from "react";

export type Measure<U extends string> = `${number}${U}`;

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string | undefined };
};

export type DivProps = Omit<DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>, "title"> & { tooltip?: string };
