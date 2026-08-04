import { nanoid } from "nanoid";
import { Icon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode, useCallback } from "react";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn, SocketOut } from "../../../features/nodeview/slots";
import { AllDeps, DataTypes, NodeDefinitions, NodeTypes, SocketTypes } from "../../betterTypes";
import { TextInput } from "../../../components/inputs/TextInput";
import { IntegerInput } from "../../../components/inputs/IntegerInput";
import { RadioButton } from "../../../components/buttons/RadioButton";
import { Project } from "../../../state/project";
import { Enum } from "../../datatypes/enum";
import { NumericString } from "../../datatypes/numericString";
import { EmptyOr } from "../../../util/misc";

export type SubstringDefinition = {
    inputs: {
        string: DataTypes.Use<"string">;
        startIndex: DataTypes.Use<"integer" | "float">;
        mode: DataTypes.Use<"enum">;
        length: DataTypes.Use<"integer" | "float">;
        end: DataTypes.Use<"integer" | "float">;
    };
    outputs: {
        output: DataTypes.Use<"string">;
        charCount: DataTypes.Use<"integer">;
    };
    payload: {
        label: DataTypes.TypeOf<DataTypes.Use<"string">>;
        string: DataTypes.TypeOf<DataTypes.Use<"string">>;
        startIndex: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        mode: DataTypes.TypeOf<DataTypes.Use<"enum">>;
        length: DataTypes.TypeOf<DataTypes.Use<"integer">>;
        end: DataTypes.TypeOf<DataTypes.Use<"integer">>;
    };
};

const MODE_OPTIONS = Enum.options(Enum.Common.substringMode);

const create = (input: Partial<NodeDefinitions.PayloadTypeOf<SubstringDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"substring", SubstringDefinition> => {
    return {
        id,
        in: {
            string: null,
            startIndex: null,
            mode: null,
            length: null,
            end: null,
        },
        out: {
            output: [],
            charCount: [],
        },
        payload: {
            label: "",
            string: "",
            startIndex: "0",
            // Default to End mode with end=0, which our convention maps to the end of
            // the string — so a fresh node passes the input through unchanged.
            mode: Enum.Common.substringMode.END.value,
            length: "0",
            end: "0",
            ...input,
        },
        type: "substring",
    };
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<SubstringDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const handleUpdate = useCallback(
        (v: Partial<NodeDefinitions.PayloadTypeOf<SubstringDefinition>>) => {
            methods.update(v);
        },
        [methods],
    );

    const isLength = node.payload.mode === Enum.Common.substringMode.LENGTH.value;
    const isEnd = node.payload.mode === Enum.Common.substringMode.END.value;

    return (
        <TypicalNode node={node} methods={methods}>
            <SocketOut node={node} socketId={"output"}>
                Output
            </SocketOut>
            <SocketIn node={node} socketId={"string"} label={"String"}>
                <TextInput value={node.payload.string} onCommit={(string) => handleUpdate({ string })} disabled={node.in.string !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"startIndex"} label={"Start Index"}>
                <IntegerInput value={node.payload.startIndex} onCommit={(startIndex) => handleUpdate({ startIndex })} disabled={node.in.startIndex !== null} />
            </SocketIn>
            <SocketIn node={node} socketId={"mode"} label={"Mode"}>
                <RadioButton.Group
                    orientation={"horizontal"}
                    value={`${node.payload.mode}`}
                    onValue={(v) => handleUpdate({ mode: Number(v) })}
                    disabled={node.in.mode !== null}
                    options={MODE_OPTIONS}
                />
            </SocketIn>
            <SocketIn node={node} socketId={"length"} label={"Length"}>
                <IntegerInput value={node.payload.length} onCommit={(length) => handleUpdate({ length })} disabled={node.in.length !== null || !isLength} min={"0"} />
            </SocketIn>
            <SocketIn node={node} socketId={"end"} label={"End"}>
                <IntegerInput value={node.payload.end} onCommit={(end) => handleUpdate({ end })} disabled={node.in.end !== null || !isEnd} />
            </SocketIn>
            <SocketOut node={node} socketId={"charCount"}>
                Character Count
            </SocketOut>
        </TypicalNode>
    );
};

const ALL_INPUTS: (keyof SubstringDefinition["inputs"])[] = ["string", "startIndex", "mode", "length", "end"];

const dependsOn = (_node: NodeDefinitions.NodeFor<SubstringDefinition>, _outSocket: keyof SubstringDefinition["outputs"], _deps: AllDeps): (keyof SubstringDefinition["inputs"])[] => {
    return ALL_INPUTS;
};

const contributesTo = (_node: NodeDefinitions.NodeFor<SubstringDefinition>, _inSocket: keyof SubstringDefinition["inputs"], _deps: AllDeps): (keyof SubstringDefinition["outputs"])[] => {
    return ["output", "charCount"];
};

const resolveInt = (context: Resolver.Context, nodeId: string, socketId: keyof SubstringDefinition["inputs"], fallback: EmptyOr<NumericString.Type>, def: number): number => {
    const raw = context.resolve<"integer" | "float">(nodeId, socketId)?.data ?? fallback;
    return Math.round(NumericString.Emptyable.asNumber(raw) ?? def);
};

const evaluate = (node: NodeDefinitions.NodeFor<SubstringDefinition>, socket: keyof SubstringDefinition["outputs"], context: Resolver.Context): DataTypes.AnyEval | null => {
    if (socket !== "output" && socket !== "charCount") return null;

    const str = context.resolve<"string">(node.id, "string")?.data ?? node.payload.string ?? "";
    const len = str.length;

    // Resolve start: negative counts from the end, then clamp into [0, len].
    const startRaw = resolveInt(context, node.id, "startIndex", node.payload.startIndex, 0);
    const start = Math.max(0, Math.min(len, startRaw < 0 ? len + startRaw : startRaw));

    const mode = Enum.resolve(context.resolve<"enum">(node.id, "mode")?.data, Enum.Common.substringMode) ?? node.payload.mode;

    let end: number;
    if (mode === Enum.Common.substringMode.LENGTH.value) {
        const length = Math.max(0, resolveInt(context, node.id, "length", node.payload.length, 0));
        end = start + length;
    } else {
        // End mode. Convention deviates from JS slice at 0: end <= 0 measures from the
        // end of the string (so end=0 means "to the end"), end > 0 is absolute from start.
        const endRaw = resolveInt(context, node.id, "end", node.payload.end, 0);
        end = endRaw <= 0 ? len + endRaw : endRaw;
    }
    end = Math.max(start, Math.min(len, end));
    const result = str.slice(start, end);

    if (socket === "output") return { kind: "string", data: result };
    return { kind: "integer", data: `${result.length}` };
};

const SOCKETTYPES_IN: { [key in keyof Required<SubstringDefinition["inputs"]>]: SocketTypes.SocketRule } = {
    string: { types: ["string"], mode: "or" },
    startIndex: { types: ["integer", "float"], mode: "or" },
    mode: { types: ["enum"], mode: "or" },
    length: { types: ["integer", "float"], mode: "or" },
    end: { types: ["integer", "float"], mode: "or" },
};

const SOCKETTYPES_OUT: { [key in keyof Required<SubstringDefinition["outputs"]>]: SocketTypes.SocketRule } = {
    output: { types: ["string"], mode: "and" },
    charCount: { types: ["integer"], mode: "and" },
};

const getSocketType = (_node: NodeDefinitions.NodeFor<SubstringDefinition>, socketId: string, side: "in" | "out"): SocketTypes.SocketRule => {
    switch (side) {
        case "in":
            return SOCKETTYPES_IN[socketId as keyof typeof SOCKETTYPES_IN];
        case "out":
            return SOCKETTYPES_OUT[socketId as keyof typeof SOCKETTYPES_OUT];
    }
};

export const SubstringNodeType: NodeTypes.Type<"substring", SubstringDefinition> = {
    type: "substring",
    displayName: "Substring",
    defaultLabel: "Substring",
    iconNode: <Icon shape={NODE_ICONS.substring} color={"var(--icon-flavour)"} />,
    category: "Math",
    create,
    dependsOn,
    contributesTo,
    evaluate,
    Controls,
    getSocketType,
};
