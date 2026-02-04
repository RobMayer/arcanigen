import { ReactNode, useCallback, useMemo } from "react";
import { NodeTypeRegistry } from "../../definitions";
import { Project } from "../../state/project";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import styled from "styled-components";
import { Socket } from "./socket";
import { AnyDefinition, NodeType } from "../../definitions/nodes/abstractNode";
import { DataTypes } from "../../definitions/datatypes";
import LengthInput from "../../components/inputs/LengthInput";
import { Color, Length } from "../../types";
import ColorHexInput from "../../components/inputs/ColorHexInput";
import TextInput from "../../components/inputs/TextInput";

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
                case "accordion": // Todo: handle UI type slots
            }
            return null;
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
        case "string":
            return <WidgetString slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "length":
            return <WidgetLength slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "color":
            return <WidgetColor slot={slot} node={node} disabled={connectedIn || connectedOut} update={update} />;
        case "float":
        case "integer":
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

    // todo: handleChange
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

    // todo: handleChange
    switch (slot.widget) {
        case "input":
            return <LengthInput value={node.payload[slot.property] as Length} disabled={disabled} onCommit={handleChange} />;
    }
};

const WidgetColor = ({ slot, node, disabled, update }: SlotProps<"color">) => {
    const handleChange = useCallback(
        (v: string) => {
            update?.({ [slot.property]: v });
        },
        [slot.property, update],
    );

    // todo: handleChange
    switch (slot.widget) {
        case "hex":
            return <ColorHexInput value={node.payload[slot.property] as Color} disabled={disabled} nullable={slot.nullable} alpha={slot.alpha} onCommit={handleChange} />;
    }
};

//#endregion

//#region UI based Elemnts

const Hr = styled.hr`
    margin: 0.25em 0.5em;
    border: none;
    border-top: 1px dashed #666;
    flex: 1 1;
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
