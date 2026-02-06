import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import { NodeTypeRegistry } from "../../definitions";
import { Project } from "../../state/project";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import styled from "styled-components";
import { Socket } from "./socket";
import { AnyDefinition, NodeType } from "../../definitions/nodes/abstractNode";
import { DataTypes } from "../../definitions/datatypes";
import LengthInput from "../../components/inputs/LengthInput";
import { Color } from "../../types";
import ColorHexInput from "../../components/inputs/ColorHexInput";
import TextInput from "../../components/inputs/TextInput";
import { Dropdown } from "../../components/inputs/Dropdown";
import { RadioBox } from "../../components/buttons/RadioBox";
import { RadioButton } from "../../components/buttons/RadioButton";
import { Icon, ICONS } from "../../components/Icon";
import { Session } from "../../state/session";
import { ActionButton } from "../../components/buttons/ActionButton";
import { EmptyOr, NumericString } from "../../util/misc";
import NumberInput from "../../components/inputs/NumberInput";
import { useGraphId } from "../../state/graphId";
import { Length } from "../../definitions/datatypes/length";

type BaseNode = ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>;

export const GraphSlots = styled(({ nodeId, className }: { nodeId: string; className?: string }) => {
    const [node, methods] = Project.useNode(nodeId);
    const nodeType = NodeTypeRegistry.get(node.type);

    const slots = useMemo(() => {
        return nodeType.getSlots(node);
    }, [nodeType, node]);

    return (
        <div className={className}>
            {slots.map((slot, i) => {
                return <GraphSlot node={node} nodeType={nodeType} slot={slot} key={i} update={methods.update} />;
            })}
        </div>
    );
})`
    display: grid;
    gap: 4px;
    margin: 8px;
`;

const GraphSlot = styled(
    ({
        slot,
        node,
        className,
        nodeType,
        update,
    }: {
        slot: DataTypes.AnySlot;
        node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>;
        nodeType: NodeType;
        className?: string;
        update: (data: Partial<DataTypes.PayloadFor<AnyDefinition>>) => void;
    }) => {
        if (slot.type === "ui") {
            switch (slot.widget) {
                case "hr":
                    return <Hr />;
                case "accordion":
                    return <SlotAccordion slot={slot} node={node} nodeType={nodeType} className={className} update={update} />;
                case "heading":
                    return <Heading>{slot.label}</Heading>;
            }
        }
        return (
            <div className={className}>
                {"socketIn" in slot ? <Socket nodeId={node.id} socketId={slot.socketIn!} side={"in"} type={slot.type} connected={(node.in[slot.socketIn!] ?? null) !== null} /> : null}
                {slot.widget === "none" || !slot.property ? (
                    <LabelBig align={"socketOut" in slot && slot.socketOut !== undefined ? "right" : "left"}>{slot.label}</LabelBig>
                ) : (
                    <LabelSmall label={slot.label}>
                        <GraphSlotChoice slot={slot} node={node} update={update} />
                    </LabelSmall>
                )}
                {"socketOut" in slot ? <Socket nodeId={node.id} socketId={slot.socketOut!} side={"out"} type={slot.type} connected={(node.out?.[slot.socketOut!]?.length ?? 0) > 0} /> : null}
            </div>
        );
    },
)`
    display: flex;
    gap: 6px;
`;

//#region Datatype-based Elements

type SlotProps<K extends DataTypes.Keys> = {
    slot: DataTypes.SlotWidgetable & DataTypes.SlotWithProperty<K>;
    node: BaseNode;
    disabled?: boolean;
    update?: (data: Partial<DataTypes.PayloadFor<AnyDefinition>>) => void;
};

const GraphSlotChoice = ({
    slot,
    node,
    update,
}: {
    slot: DataTypes.SlotWidgetable;
    node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>;
    update: (data: Partial<DataTypes.PayloadFor<AnyDefinition>>) => void;
}) => {
    const connectedIn = slot.socketIn ? node.in[slot.socketIn] !== null : false;
    const connectedOut = slot.socketOut ? (node.out[slot.socketOut]?.length ?? 0) !== 0 : false;

    switch (slot.type) {
        case "integer":
            return <WidgetInteger slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "float":
            return <WidgetFloat slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "string":
            return <WidgetString slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "length":
            return <WidgetLength slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "color":
            return <WidgetColor slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "enum":
            return <WidgetEnum slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "tokens<length>":
            return <WidgetTokensLength slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
    }
    return null;
};

const WidgetInteger = ({ slot, node, disabled, update }: SlotProps<"integer">) => {
    const handleChange = useCallback(
        (v: EmptyOr<NumericString>) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "input":
            return <NumberInput value={node.payload[slot.property] as EmptyOr<NumericString>} disabled={disabled} onCommit={handleChange} bounds={slot.bounds} step={slot.step} />;
        case "slider":
            return null;
    }
};

const WidgetFloat = ({ slot, node, disabled, update }: SlotProps<"float">) => {
    const handleChange = useCallback(
        (v: EmptyOr<NumericString>) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "input":
            return <NumberInput value={node.payload[slot.property] as EmptyOr<NumericString>} disabled={disabled} onCommit={handleChange} bounds={slot.bounds} step={slot.step ?? 1} />;
        case "slider":
            return null;
    }
};

const WidgetString = ({ slot, node, disabled, update }: SlotProps<"string">) => {
    const handleChange = useCallback(
        (v: string) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "input":
            return <TextInput value={node.payload[slot.property] as string} disabled={disabled} onCommit={handleChange} />;
    }
};

const WidgetLength = ({ slot, node, disabled, update }: SlotProps<"length">) => {
    const handleChange = useCallback(
        (v: string) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "input":
            return <LengthInput value={node.payload[slot.property] as Length.Type} disabled={disabled} onCommit={handleChange} required={!slot.nullable} />;
    }
};

const WidgetColor = ({ slot, node, disabled, update }: SlotProps<"color">) => {
    const handleChange = useCallback(
        (v: string) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "hex":
            return <ColorHexInput value={node.payload[slot.property] as Color} disabled={disabled} nullable={slot.nullable} alpha={slot.alpha} onCommit={handleChange} />;
    }
};

const WidgetEnum = ({ slot, node, disabled, update }: SlotProps<"enum">) => {
    const handleChange = useCallback(
        (v: string) => {
            const p = Number.parseInt(v);
            if (!isNaN(p)) {
                update?.({ [slot.property]: p });
            }
        },
        [slot.property, update],
    );
    switch (slot.widget) {
        case "dropdown":
            return (
                <Dropdown value={`${node.payload[slot.property] as number}`} disabled={disabled} onValue={handleChange}>
                    {slot.options.map((opt, i) => {
                        return (
                            <option value={`${i}`} key={opt}>
                                {opt}
                            </option>
                        );
                    })}
                </Dropdown>
            );
        case "radiobox":
            return (
                <Group orientation={slot.orientation}>
                    {slot.options.map((opt, i) => {
                        return (
                            <RadioBox value={`${node.payload[slot.property] as number}`} key={opt} target={`${i}`} onValue={handleChange} disabled={disabled}>
                                {opt}
                            </RadioBox>
                        );
                    })}
                </Group>
            );
        case "radiobutton":
            return (
                <Group orientation={slot.orientation}>
                    {slot.options.map((opt, i) => {
                        return (
                            <RadioButton value={`${node.payload[slot.property] as number}`} key={opt} target={`${i}`} onValue={handleChange} disabled={disabled}>
                                {opt}
                            </RadioButton>
                        );
                    })}
                </Group>
            );
    }
    return <></>;
};

const WidgetTokensLength = ({ slot, node, disabled, update }: SlotProps<"tokens<length>">) => {
    const handleChange = useCallback(
        (v: string) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );

    const tokenPattern = useMemo(() => {
        const sep = slot.sep ?? " ";
        const escapedSep = sep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const num = slot.negative ? "-?\\d+(\\.\\d+)?" : "\\d+(\\.\\d+)?";
        const unit = "(px|in|mm|cm|pt)";
        return `(${num}${unit}${escapedSep})*(${num}${unit})`;
    }, [slot.sep, slot.negative]);

    switch (slot.widget) {
        case "input":
            return <TextInput value={node.payload[slot.property] as string} onCommit={handleChange} disabled={disabled} pattern={tokenPattern} required={!slot.nullable} />;
    }
};

//#endregion

//#region UI based Elemnts

const Group = styled(({ children, orientation = "vertical", className }: { children?: ReactNode; orientation?: "horizontal" | "vertical"; className?: string }) => {
    return (
        <div data-orientation={orientation} className={className}>
            {children}
        </div>
    );
})`
    flex: 1 1;
    gap: 1px;
    background: #000;
    padding: 1px;
    border: 1px solid #666;
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    &[data-orientation="horizontal"] {
        grid-auto-flow: column;
    }
`;

const Hr = styled.hr`
    margin: 0.25em 0.5em;
    border: none;
    border-top: 1px dashed #666;
    flex: 1 1;
`;

const Heading = styled.div`
    font-size: 16pt;
    margin-top: 0.125em;
    font-variant: small-caps;
    text-align: center;
    border-bottom: 1px solid #666;
`;

const SlotAccordion = styled(
    ({
        className,
        slot,
        node,
        nodeType,
        update,
    }: {
        className?: string;
        slot: { label: string; children: DataTypes.AnySlot[]; start?: "open" | "closed" };
        node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>;
        nodeType: NodeType;
        update: (data: Partial<DataTypes.PayloadFor<AnyDefinition>>) => void;
    }) => {
        const graphId = useGraphId();
        const [isToggled, setIsToggled] = Session.useUiState<boolean>(`nodeSlot_accordion[${graphId}][${node.id}][${slot.label}]`);
        const isOpen = slot.start === "open" ? !isToggled : isToggled;
        const toggle = useCallback(() => {
            setIsToggled((p) => (p ? undefined : true));
        }, [setIsToggled]);
        const [inSockets, outSockets] = useMemo<[CSSProperties, CSSProperties]>(() => {
            const descSlots = slot.children;

            const doRecursion = (acc: [string[], string[]], slot: DataTypes.AnySlot) => {
                if ("socketIn" in slot && slot.socketIn !== undefined) {
                    acc[0].push(`--socketFB_${node.id}_${slot.socketIn}`);
                }
                if ("socketOut" in slot && slot.socketOut !== undefined) {
                    acc[1].push(`--socketFB_${node.id}_${slot.socketOut}`);
                }
                if ("children" in slot) {
                    acc = slot.children.reduce(doRecursion, acc);
                }
                // there will be other edge-cases we'll need to add, in the fullness of time.
                return acc;
            };

            const [theIn, theOut] = descSlots.reduce<[string[], string[]]>(doRecursion, [[], []]);

            return [{ anchorName: theIn.join(", ") }, { anchorName: theOut.join(", ") }];
        }, [node.id, slot.children]);

        return (
            <>
                <ActionButton.Lite className={className} onClick={toggle} type={"button"}>
                    <div style={inSockets} />
                    <Icon shape={isOpen ? ICONS.Caret.Down : ICONS.Caret.Right} />
                    <span>{slot.label}</span>
                    <div style={outSockets} />
                </ActionButton.Lite>
                {!isOpen ? null : (
                    <>
                        {slot.children.map((childSlot, i) => {
                            return <GraphSlot key={i} slot={childSlot} node={node} nodeType={nodeType} update={update} />;
                        })}
                    </>
                )}
            </>
        );
    },
)`
    background: #555;
    font-size: 13pt;
    cursor: pointer;
    font-variant: small-caps;
    gap: 0px;
    display: flex;
    align-items: center;
    margin-inline: -8px;
    & > span {
        margin-inline: 4px;
        flex: 1 1 auto;
        text-align: start;
    }
`;

//#endregion

//#region Misc

const LabelBig = styled(({ className, align = "left", children }: { className?: string; children?: ReactNode; align?: "right" | "left" }) => {
    return <div className={`${className ?? ""} align_${align}`}>{children}</div>;
})`
    flex: 1 1;
    &.align_right {
        text-align: right;
    }
`;

const LabelSmall = styled(({ children, className, label }: { children: ReactNode; label: ReactNode; className?: string }) => {
    return (
        <div className={className}>
            <div data-part={"label"}>{label}</div>
            <div data-part={"contents"}>{children}</div>
        </div>
    );
})`
    display: grid;
    grid-template-rows: auto 1fr;
    flex: 1 1;
    & > [data-part="label"] {
        font-size: 62.5%;
    }
    & > [data-part="contents"] {
        display: flex;
    }
`;
//#endregion
