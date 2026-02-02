import { Widget } from "./widgets";

type BaseSlot = {
    label: string;
    hint?: string;
};

type EitherSocket = { socketIn?: never; socketOut?: string } | { socketIn?: string; socketOut?: never };

type SlotTypes<P extends { [key: string]: unknown }> = {
    float: BaseSlot & {
        socketIn?: string;
        type: "float";
        property: keyof P;
        defaultValue: number;
    } & Widget<"numberinput" | "slider">;
    color: BaseSlot & {
        socketIn?: string;
        type: "color";
        property: keyof P;
    } & Widget<"color">;
    shape: BaseSlot &
        EitherSocket & {
            type: "shape";
        };
};

export type SlotOf<P extends { [key: string]: unknown }> = SlotTypes<P>[keyof SlotTypes<P>];

export type Slot<K extends keyof SlotTypes<{ [key: string]: unknown }>> = SlotTypes<{ [key: string]: unknown }>[K];
