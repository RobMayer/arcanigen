import { ReactNode, useMemo } from "react";
import { NodeTypeRegistry } from "../../definitions";
import { MainGraph } from "../../state/maingraph";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import styled from "styled-components";
import { Socket } from "./socket";
import { AnyDefinition, NodeType } from "../../definitions/nodes/abstractNode";
import { DataTypes } from "../../definitions/datatypes";
import LengthInput from "../../components/inputs/LengthInput";
import { Length } from "../../types";

type BaseNode = ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>;

export const GraphSlots = styled(({ nodeId, className }: { nodeId: string; className?: string }) => {
    const node = MainGraph.useNode(nodeId);
    const nodeType = NodeTypeRegistry.get(node.type);

    const slots = useMemo(() => {
        return nodeType.getSlots(node);
    }, [nodeType, node]);

    return (
        <div className={className}>
            {slots.map((slot, i) => {
                return <GraphSlot node={node} nodeType={nodeType} slot={slot} key={i} />;
            })}
        </div>
    );
})`
    display: grid;
    gap: 4px;
`;

const GraphSlot = styled(({ slot, node, className }: { slot: DataTypes.AnySlot; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>>; nodeType: NodeType; className?: string }) => {
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
            {"socketIn" in slot ? <Socket nodeId={node.id} socketId={slot.socketIn!} side={"in"} type={slot.type} /> : null}
            {slot.widget === "none" || !slot.property ? (
                <LabelBig>{slot.label}</LabelBig>
            ) : (
                <LabelSmall label={slot.label}>
                    <GraphSlotChoice slot={slot} node={node} />
                </LabelSmall>
            )}
            {"socketOut" in slot ? <Socket nodeId={node.id} socketId={slot.socketOut!} side={"out"} type={slot.type} /> : null}
        </div>
    );
})`
    display: flex;
    gap: 6px;
`;

//#region Datatype-based Elements

const GraphSlotChoice = ({ slot, node }: { slot: DataTypes.SlotWidgetable; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>> }) => {
    const connectedIn = slot.socketIn ? node.in[slot.socketIn] !== null : false;
    const connectedOut = slot.socketOut ? (node.out[slot.socketOut]?.length ?? 0) !== 0 : false;

    switch (slot.type) {
        case "string":
            return <WidgetString slot={slot} node={node} disabled={connectedIn || connectedOut} />;
        case "length":
            return <WidgetLength slot={slot} node={node} disabled={connectedIn || connectedOut} />;
        case "float":
        case "integer":
        case "color":
            return null;
    }
};

const WidgetString = ({ slot, node, disabled }: { slot: DataTypes.SlotWidgetable & DataTypes.SlotWithProperty<"string">; node: BaseNode; disabled?: boolean }) => {
    // todo: handleChange
    switch (slot.widget) {
        case "input":
            return <input value={node.payload[slot.property] as string} disabled={disabled} />;
    }
};

const WidgetLength = ({ slot, node, disabled }: { slot: DataTypes.SlotWidgetable & DataTypes.SlotWithProperty<"length">; node: BaseNode; disabled?: boolean }) => {
    // todo: handleChange
    switch (slot.widget) {
        case "input":
            return <LengthInput value={node.payload[slot.property] as Length} disabled={disabled} />;
    }
};
//#endregion

//#region UI based Elemnts

const Hr = styled.hr`
    margin: 0.25em 0.5em;
    border: none;
    border-top: 1px dashed #666;
`;

//#endregion

//#region Misc
const LabelBig = styled.div``;

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
    & > [data-part="label"] {
        font-size: 62.5%;
    }
`;
//#endregion
