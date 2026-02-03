import { ReactNode, useMemo } from "react";
import { NodeTypeRegistry } from "../../definitions";
import { MainGraph } from "../../state/maingraph";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import styled from "styled-components";
import { Socket } from "./socket";
import { AnyDefinition, NodeType } from "../../definitions/nodes/abstractNode";
import { DataTypes } from "../../definitions/datatypes";

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
        // Todo: handle UI type slots
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

const GraphSlotChoice = ({ slot, node }: { slot: DataTypes.SlotWidgetable; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>> }) => {
    switch (slot.type) {
        case "string":
            return <WidgetString slot={slot} node={node} />;
        case "length":
        case "float":
        case "integer":
        case "color":
            return null;
    }
};

const WidgetString = ({ slot, node }: { slot: DataTypes.SlotWithProperty<"string">; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<AnyDefinition>> }) => {
    const connectedIn = slot.socketIn ? node.in[slot.socketIn] !== null : false;
    const connectedOut = slot.socketOut ? (node.out[slot.socketOut]?.length ?? 0) !== 0 : false;

    // todo: handleChange
    switch (slot.widget) {
        case "input":
            return <input value={node.payload[slot.property] as string} disabled={connectedOut || connectedIn} />;
    }
    return <></>;
};

// const WidgetColor = ({ slot, node, connected }: { slot: SlotFor<any, "color"> & Widget<"color">; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>>; connected: boolean }) => {
//     const pattern = useMemo(() => {
//         return `${slot.nullable ? "none|" : ""}#(?:[0-9a-fA-F]{${slot.alpha ? "4" : "3"}}|[0-9a-fA-F]{${slot.alpha ? "8" : "6"}})`;
//     }, [slot.alpha, slot.nullable]);

//     return <input type="text" pattern={pattern} value={node.payload[slot.property] as string} disabled={connected} />;
// };

// const WidgetFloat = ({ slot, node, connected }: { slot: SlotFor<any, "float"> & Widget<"numberinput">; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>>; connected: boolean }) => {
//     return <input type="number" min={slot.min} max={slot.max} step={slot.step} value={node.payload[slot.property]} disabled={connected} />;
// };

// const WidgetSlider = ({ slot, node, connected }: { slot: SlotFor<any, "float"> & Widget<"slider">; node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<BaseDefinition>>; connected: boolean }) => {
//     return <input type="number" min={slot.min} max={slot.max} step={slot.step} value={node.payload[slot.property]} disabled={connected} />;
// };
