import { useMemo } from "react";
import { NodeType, NODETYPE_REGISTRY } from "../../definitions";
import { MainGraph } from "../../state/maingraph";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import { Slot, SlotOf } from "../../definitions/slots";
import { Widget } from "../../definitions/widgets";

export const GraphNode = ({ nodeId }: { nodeId: string }) => {
    const node = MainGraph.useNode(nodeId);
    const nodeType = NODETYPE_REGISTRY[node.type];

    return (
        <>
            <GraphSlots node={node} nodeType={nodeType} />
        </>
    );
};

const GraphSlots = ({ node, nodeType }: { node: ArcaneGraph.NodeOf<MainGraph.BaseNode>; nodeType: NodeType }) => {
    const slots = useMemo(() => {
        return nodeType.getSlots(node);
    }, [nodeType, node]);

    return (
        <>
            {slots.map((slot, i) => {
                switch (slot.type) {
                    case "float":
                        return <GraphSlotFloat slot={slot} node={node} />;
                    case "color":
                    case "shape":
                }
                return null;
            })}
        </>
    );
};

const GraphSlotFloat = ({ slot, node }: { slot: Slot<"float">; node: ArcaneGraph.NodeOf<MainGraph.BaseNode> }) => {
    return (
        <>
            {slot.socketIn ? <Socket /> : null}
            <GraphWidget slot={slot} node={node} />
        </>
    );
};

const GraphWidget = ({ slot, node }: { slot: SlotOf<{ [key: string]: unknown }>; node: ArcaneGraph.NodeOf<MainGraph.BaseNode> }) => {
    if (!("widget" in slot)) {
        return slot.label;
    }
    switch (slot.widget) {
        case "color":
            return <WidgetColor slot={slot} node={node} />;
        case "numberinput":
            return <WidgetFloat />;
        case "slider":
            return <WidgetSlider />;
    }
};

const WidgetColor = ({ slot, node }: { slot: Slot<"color">; node: ArcaneGraph.NodeOf<MainGraph.BaseNode> }) => {
    const pattern = useMemo(() => {
        return `${slot.nullable ? "none|" : ""}#(?:[0-9a-fA-F]{${slot.alpha ? "4" : "3"}}|[0-9a-fA-F]{${slot.alpha ? "8" : "6"}})`;
    }, [slot.alpha, slot.nullable]);

    return <input type="text" pattern={pattern} value={node.payload[slot.property] as string} disabled={slot.socketIn && node.in[slot.socketIn] !== null ? true : false} />;
};

const WidgetFloat = () => {
    return <input type="number" />;
};

const WidgetSlider = () => {
    return <input type="range" />;
};

// TODO: make a socket...
const Socket = () => {
    return <div />;
};
