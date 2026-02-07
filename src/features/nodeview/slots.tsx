import { CSSProperties, ReactNode, useCallback, useMemo } from "react";
import { ArcaneGraph } from "../../util/structs/arcaneGraph";
import styled from "styled-components";
import { Socket } from "./socket";
import { AnyDefinition } from "../../definitions/nodes/abstractNode";
import { DataTypes, SocketTypes } from "../../definitions/datatypes";
import { Icon, ICONS } from "../../components/Icon";
import { Session } from "../../state/session";
import { ActionButton } from "../../components/buttons/ActionButton";
import { useGraphId } from "../../state/graphId";

const SlotBase = styled.div`
    display: flex;
    gap: 6px;
`;

export const SocketIn = <D extends AnyDefinition, K extends keyof D["inputs"] & string>({
    node,
    socketId,
    type,
    label,
    children,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>;
    socketId: K;
    type: SocketTypes.SocketTypeFor<DataTypes.KeyOf<D["inputs"][K]>>;
}) => {
    return (
        <SlotBase>
            <Socket side={"in"} socketId={socketId} nodeId={node.id} type={type} connected={node.in[socketId] !== null} />
            {label ? <LabelSmall label={label}>{children}</LabelSmall> : <LabelBig align={"left"}>{children}</LabelBig>}
        </SlotBase>
    );
};

export const SocketOut = <D extends AnyDefinition, K extends keyof D["outputs"] & string>({
    node,
    socketId,
    type,
    label,
    children,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: ArcaneGraph.NodeOf<DataTypes.PayloadFor<D>>;
    socketId: K;
    type: SocketTypes.SocketTypeFor<DataTypes.KeyOf<D["outputs"][K]>>;
}) => {
    return (
        <SlotBase>
            {label ? <LabelSmall label={label}>{children}</LabelSmall> : <LabelBig align={"right"}>{children}</LabelBig>}
            <Socket side={"out"} socketId={socketId} nodeId={node.id} type={type} connected={node.out[socketId].length > 0} />
        </SlotBase>
    );
};

export const NodeAccordion = styled(
    ({
        className,
        children,
        start,
        label,
        nodeId,
        socketsIn = "",
        socketsOut = "",
    }: {
        className?: string;
        children?: ReactNode;
        start?: "open" | "closed";
        label: string;
        nodeId: string;
        socketsIn?: string;
        socketsOut?: string;
    }) => {
        const [inSockets, outSockets] = useMemo<[CSSProperties, CSSProperties]>(() => {
            return [
                {
                    anchorName:
                        socketsIn === ""
                            ? undefined
                            : socketsIn
                                  .split("|")
                                  .map((each) => `--socketFB_${nodeId}_${each}`)
                                  .join(", "),
                },
                {
                    anchorName:
                        socketsOut === ""
                            ? undefined
                            : socketsOut
                                  .split("|")
                                  .map((each) => `--socketFB_${nodeId}_${each}`)
                                  .join(", "),
                },
            ];
        }, [nodeId, socketsIn, socketsOut]);

        const graphId = useGraphId();
        const [isToggled, setIsToggled] = Session.useUiState<boolean>(`nodeSlot_accordion[${graphId}][${nodeId}][${label}]`);
        const isOpen = start === "open" ? !isToggled : isToggled;
        const toggle = useCallback(() => {
            setIsToggled((p) => (p ? undefined : true));
        }, [setIsToggled]);

        return (
            <>
                <ActionButton.Lite className={className} onClick={toggle} type={"button"}>
                    <div style={inSockets} />
                    <Icon shape={isOpen ? ICONS.Caret.Down : ICONS.Caret.Right} />
                    <span>{label}</span>
                    <div style={outSockets} />
                </ActionButton.Lite>

                {!isOpen ? null : children}
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
