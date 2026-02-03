import { useMemo } from "react";
import { NodeTypeRegistry } from "../../definitions";
import { MainGraph } from "../../state/maingraph";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { SlotFor, SlotOf } from "../../definitions/slots";
import { Widget } from "../../definitions/widgets";
import styled from "styled-components";
import { Socket } from "./socket";
import { NodeType } from "../../definitions/nodes/abstractNode";

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

const GraphSlot = styled(({ slot, node, className }: { slot: SlotOf<any>; node: ArcaneGraph.NodeOf<any>; nodeType: NodeType; className?: string }) => {
    return (
        <div className={className}>
            {slot.socketIn ? <Socket nodeId={node.id} socketId={slot.socketIn} side={"in"} type={slot.type} /> : null}
            <GraphWidget slot={slot} node={node} />
        </div>
    );
})`
    display: flex;
    gap: 6px;
`;

const GraphWidget = ({ slot, node }: { slot: SlotOf<any>; node: ArcaneGraph.NodeOf<any> }) => {
    if (!("widget" in slot)) {
        return slot.label;
    }

    switch (slot.widget) {
        case "none":
            return slot.label;
        case "color":
            return <WidgetColor slot={slot} node={node} connected={slot.socketIn ? node.in[slot.socketIn] === null : false} />;
        case "numberinput":
            return <WidgetFloat slot={slot} node={node} connected={slot.socketIn ? node.in[slot.socketIn] === null : false} />;
        case "slider":
            return <WidgetSlider slot={slot} node={node} connected={slot.socketIn ? node.in[slot.socketIn] === null : false} />;
    }
};

const WidgetColor = ({ slot, node, connected }: { slot: SlotFor<any, "color"> & Widget<"color">; node: ArcaneGraph.NodeOf<any>; connected: boolean }) => {
    const pattern = useMemo(() => {
        return `${slot.nullable ? "none|" : ""}#(?:[0-9a-fA-F]{${slot.alpha ? "4" : "3"}}|[0-9a-fA-F]{${slot.alpha ? "8" : "6"}})`;
    }, [slot.alpha, slot.nullable]);

    return <input type="text" pattern={pattern} value={node.payload[slot.property] as string} disabled={connected} />;
};

const WidgetFloat = ({ slot, node, connected }: { slot: SlotFor<any, "float"> & Widget<"numberinput">; node: ArcaneGraph.NodeOf<any>; connected: boolean }) => {
    return <input type="number" min={slot.min} max={slot.max} step={slot.step} value={node.payload[slot.property]} disabled={connected} />;
};

const WidgetSlider = ({ slot, node, connected }: { slot: SlotFor<any, "float"> & Widget<"slider">; node: ArcaneGraph.NodeOf<any>; connected: boolean }) => {
    return <input type="number" min={slot.min} max={slot.max} step={slot.step} value={node.payload[slot.property]} disabled={connected} />;
};
