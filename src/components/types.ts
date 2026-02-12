import { ReactNode } from "react";

export type Flavour = "base" | "accent" | "info" | "danger" | "emphasis" | "help" | "confirm" | "inherit";

export type PopoverPosition =
    | "top"
    | "top center"
    | "top span-left"
    | "top span-right"
    | "bottom"
    | "bottom center"
    | "bottom span-left"
    | "bottom span-right"
    | "left"
    | "left center"
    | "left span-top"
    | "left span-bottom"
    | "right"
    | "right center"
    | "right span-top"
    | "right span-bottom"
    | "top left"
    | "top right"
    | "bottom left"
    | "bottom right";

export type Options<T extends string = string> = { value: T; label: ReactNode; disabled?: boolean; flavour?: Flavour }[];
