import { CSSProperties, ReactNode, Ref, useCallback, useMemo } from "react";
import styled from "styled-components";
import { Socket } from "./socket";
import { Icon, ICONS } from "../../components/Icon";
import { Session } from "../../state/session";
import { ActionButton } from "../../components/buttons/ActionButton";
import { useGraphId } from "../../state/graphId";
import { NodeDefinitions, SocketTypes } from "../../definitions/betterTypes";
import { Flavour } from "../../components/types";

const SlotBase = styled.div`
    display: flex;
    gap: 6px;
`;

export const SocketIn = <D extends NodeDefinitions.Generic, K extends keyof D["inputs"] & string>({
    node,
    socketId,
    type,
    label,
    children,
    ref,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: NodeDefinitions.NodeFor<D>;
    socketId: K;
    type: SocketTypes.ForDataType<D["inputs"][K]>;
    ref?: Ref<HTMLDivElement>;
}) => {
    return (
        <SlotBase ref={ref}>
            <Socket side={"in"} socketId={socketId} nodeId={node.id} type={type} connected={node.in[socketId] !== null} />
            {label ? (
                <LabelSmall label={label} align={"left"}>
                    {children}
                </LabelSmall>
            ) : (
                <LabelBig align={"left"}>{children}</LabelBig>
            )}
        </SlotBase>
    );
};

export const SocketOut = <D extends NodeDefinitions.Generic, K extends keyof D["outputs"] & string>({
    node,
    socketId,
    type,
    label,
    children,
    ref,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: NodeDefinitions.NodeFor<D>;
    socketId: K;
    type: SocketTypes.ForDataType<D["outputs"][K]>;
    ref?: Ref<HTMLDivElement>;
}) => {
    return (
        <SlotBase ref={ref}>
            {label ? (
                <LabelSmall label={label} align={"right"}>
                    {children}
                </LabelSmall>
            ) : (
                <LabelBig align={"right"}>{children}</LabelBig>
            )}
            <Socket side={"out"} socketId={socketId} nodeId={node.id} type={type} connected={node.out[socketId].length > 0} />
        </SlotBase>
    );
};

export const Slot = ({ children, label }: { children?: ReactNode; label?: ReactNode }) => {
    return <SlotBase>{label ? <LabelSmall label={label}>{children}</LabelSmall> : <LabelBig align={"left"}>{children}</LabelBig>}</SlotBase>;
};

export const NodeAccordion = styled(
    ({
        className,
        children,
        start,
        label,
        nodeId,
        accordionId,
        socketsIn = "",
        socketsOut = "",
        flavour = "base",
    }: {
        className?: string;
        children?: ReactNode;
        start?: "open" | "closed";
        label: string;
        accordionId?: string;
        nodeId: string;
        socketsIn?: string;
        socketsOut?: string;
        flavour?: Flavour;
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
        const [isToggled, setIsToggled] = Session.useUiState<boolean>(`nodeSlot_accordion[${graphId}][${nodeId}][${accordionId ?? label}]`);
        const isOpen = start === "open" ? !isToggled : isToggled;
        const toggle = useCallback(() => {
            setIsToggled((p) => (p ? undefined : true));
        }, [setIsToggled]);

        return (
            <>
                <ActionButton.Lite className={className} onClick={toggle} type={"button"} flavour={flavour}>
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
    background: oklch(from var(--flavour) calc(l - 0.05) calc(c * 0.75) h);
    font-size: 13pt;
    cursor: pointer;
    font-variant: small-caps;
    gap: 0px;
    display: flex;
    align-items: center;
    margin-inline: -8px;
    margin-block: 4px;
    & > span {
        margin-inline: 4px;
        flex: 1 1 auto;
        text-align: start;
    }
`;

const LabelBig = styled(({ className, align = "left", children }: { className?: string; children?: ReactNode; align?: "right" | "left" }) => {
    return <div className={`${className ?? ""} align_${align}`}>{children}</div>;
})`
    flex: 1 1 auto;
    display: flex;
    gap: 4px;
    &.align_right {
        justify-content: right;
    }
`;

const LabelSmall = styled(({ children, className, label, align }: { children: ReactNode; label: ReactNode; className?: string; align?: "right" | "left" }) => {
    return (
        <div className={`${className ?? ""} align_${align}`}>
            <div data-part={"label"}>{label}</div>
            <div data-part={"contents"}>{children}</div>
        </div>
    );
})`
    display: grid;
    grid-template-rows: auto 1fr;
    flex: 1 1;

    &.align_right {
        text-align: right;
    }

    & > [data-part="label"] {
        font-size: 62.5%;
    }
    & > [data-part="contents"] {
        display: flex;
    }
`;
