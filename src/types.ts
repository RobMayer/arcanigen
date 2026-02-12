export type Measure<U extends string> = `${number}${U}`;

export type SVGObject = {
    tag: "g" | "path" | "svg";
    children: SVGObject[];
    attributes: { [key: string]: string | undefined };
};
