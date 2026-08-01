import { CSSProperties, ReactNode, Ref, useCallback, useMemo } from "react";
import styled from "styled-components";
import { Socket } from "./socket";
import { Icon, ICONS } from "../../components/Icon";
import { Project } from "../../state/project";
import { ActionButton } from "../../components/buttons/ActionButton";
import { useGraphId } from "../../state/graphId";
import { DataTypes, NodeDefinitions } from "../../definitions/betterTypes";
import { Flavour } from "../../components/types";
import { Shape } from "../../definitions/shapeTypes";
import { ShapeElement } from "../../definitions/shapeRenderer";
import { Color } from "../../definitions/datatypes/color";
import { Length } from "../../definitions/datatypes/length";
import { EmptyOr } from "../../util/misc";

const SlotBase = styled.div`
    display: flex;
    gap: 6px;
`;

export const SocketIn = <D extends NodeDefinitions.Generic, K extends keyof D["inputs"] & string>({
    node,
    socketId,
    label,
    children,
    ref,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: NodeDefinitions.NodeFor<D>;
    socketId: K;
    ref?: Ref<HTMLDivElement>;
}) => {
    return (
        <SlotBase ref={ref}>
            <Socket side={"in"} socketId={socketId} nodeId={node.id} node={node as NodeDefinitions.NodeFor<NodeDefinitions.Any>} connected={node.in[socketId] !== null} />
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

export const ShapePreview = styled(({ shape, className, color }: { shape: Shape | null; className?: string; color?: DataTypes.TypeOf<DataTypes.Use<"color">> }) => {
    const style = useMemo(
        () => ({
            backgroundColor: Color.toHex(color ?? { r: 1, g: 1, b: 1, a: 1 }),
        }),
        [color],
    );

    if (!shape) return <div className={className} />;

    const { x, y, w, h } = shape.preview;
    const pad = Math.max(w, h) * 0.05;

    return (
        <div className={className} style={style}>
            {pad === 0 ? null : (
                <svg viewBox={`${x - pad} ${y - pad} ${w + pad * 2} ${h + pad * 2}`}>
                    <ShapeElement shape={shape} />
                </svg>
            )}
        </div>
    );
})`
    background: #222;
    border: 1px solid #666;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    & > svg {
        position: absolute;
        inset: 0;
    }
`;

export const SocketOut = <D extends NodeDefinitions.Generic, K extends keyof D["outputs"] & string>({
    node,
    socketId,
    label,
    children,
    ref,
}: {
    children?: ReactNode;
    label?: ReactNode;
    node: NodeDefinitions.NodeFor<D>;
    socketId: K;
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
            <Socket side={"out"} socketId={socketId} nodeId={node.id} node={node as NodeDefinitions.NodeFor<NodeDefinitions.Any>} connected={node.out[socketId].length > 0} />
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
        const [isToggled, setIsToggled] = Project.useUiState<boolean>(`nodeSlot_accordion[${graphId}][${nodeId}][${accordionId ?? label}]`);
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
    align-items: center;
    justify-content: space-between;
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
    align-items: center;

    &.align_right {
        text-align: right;
    }

    & > [data-part="label"] {
        font-size: 62.5%;
    }
    & > [data-part="contents"] {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
`;

// todo: more meaningful returns for certain data-types - ReactNode instead of string - colors that output a swatch, for example - for later
export const ValuePreview = ({ value }: { value: DataTypes.AnyEval | null }): ReactNode => {
    if (value === null) {
        return <PreviewBase>{"« none »"}</PreviewBase>;
    }
    switch (value.kind) {
        case "string":
            return <PreviewBase>{value.data}</PreviewBase>;
        case "length":
            return <PreviewBase>{parseLength(value.data)}</PreviewBase>;
        case "boolean":
            return <PreviewBase>{value.data ? "true" : "false"}</PreviewBase>;
        case "angle":
            return <PreviewBase>{Number(Number(value.data).toFixed(6))}°</PreviewBase>;
        case "integer":
        case "float":
            return <PreviewBase>{Number(Number(value.data).toFixed(6))}</PreviewBase>;
        case "tokens<length>":
            return <PreviewBase>{value.data}</PreviewBase>;
        case "color":
            return <PreviewColor value={value.data} />;
        case "path":
        case "enum":
        case "distribution":
        case "shape":
        case "layer":
        case "array<layer>":
        case "pathOp":
        case "array<pathOp>":
        case "sequence":
            return <PreviewBase>{`« ${value.kind} »`}</PreviewBase>;
    }
};

const parseLength = (l: EmptyOr<Length.Type>): string => {
    const c = Length.Emptyable.parse(l);
    if (c === null) {
        return "« none »";
    }
    const [v, u] = c;
    return `${Number(v.toFixed(6))}${u}`;
};

const PreviewBase = styled.div`
    background: #222;
    border: 1px solid #888;
    text-align: center;
    display: flex;
    align-self: center;
    justify-self: center;
    justify-content: center;
    align-items: center;
    flex: 1 1 auto;
    padding: 0.25em 0.4em;
`;

const PreviewColor = styled(({ value, className }: { value: Color.Type; className?: string }) => {
    const styleValue = useMemo(() => {
        return { "--value": value === null ? "transparent" : Color.toHex(value) } as CSSProperties;
    }, [value]);

    return (
        <div className={className}>
            <BaseSwatch style={styleValue} />
            {Color.toHex(value)}
        </div>
    );
})`
    background: #222;
    display: inline-grid;
    grid-template-columns: auto 1fr;
    border: 1px solid #888;
    text-align: center;
    align-self: center;
    justify-self: center;
    justify-content: center;
    align-items: center;
    flex: 1 1 auto;
    padding: 0.25em 0.4em;
`;

const BaseSwatch = styled.span`
    flex: 0 0 1lh;
    background: url("swatch.png");
    background-size: 25%;
    display: block;
    height: 1lh;
    aspect-ratio: 1;
    align-self: center;
    border: 1px solid black;
    &:after {
        display: block;
        content: "";
        width: 100%;
        height: 100%;
        background-color: var(--value);
    }
`;
