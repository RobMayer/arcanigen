import { ReactNode, useMemo, useRef } from "react";
import { Project } from "../../state/project";
import { SVGDefinition, SVGMember, SVGShape } from "../../types";
import { Resolver } from "../../util/resolver";
import styled from "styled-components";
import { DragPane, DragPaneControls } from "../../components/wrappers/DragPane";

type SVGRenderable = SVGShape | SVGMember | SVGDefinition;

export const renderSVGObject = (obj: SVGRenderable, key: string | number): ReactNode => {
    const { tag, attributes, style } = obj;
    const childNodes = (obj.children ?? []).flatMap((child, i) => (child ? [renderSVGObject(child, i)] : []));

    // Render inline definitions from SVGShape
    let defsNode: ReactNode = null;
    if ("definitions" in obj && obj.definitions) {
        const defChildren = obj.definitions.flatMap((def, i) => (def ? [renderSVGObject(def, `def-${i}`)] : []));
        if (defChildren.length > 0) {
            defsNode = <defs key="defs">{defChildren}</defs>;
        }
    }

    // Apply transform from SVGShape
    const transform = "transform" in obj ? obj.transform : undefined;
    const allAttrs = transform ? { ...attributes, transform } : attributes;

    let element: ReactNode;
    switch (tag) {
        case "g":
            element = (
                <g key={key} {...allAttrs} style={style}>
                    {defsNode}
                    {childNodes}
                </g>
            );
            return element;
        case "path":
            element = <path key={key} {...allAttrs} style={style} />;
            break;
        case "line":
            element = <line key={key} {...allAttrs} style={style} />;
            break;
        case "rect":
            element = <rect key={key} {...allAttrs} style={style} />;
            break;
        case "marker":
            return (
                <marker key={key} {...allAttrs} style={style}>
                    {childNodes}
                </marker>
            );
    }

    // Wrap leaf elements in a <g> if they carry definitions
    if (defsNode) {
        return (
            <g key={key}>
                {defsNode}
                {element}
            </g>
        );
    }
    return element;
};

type SvgCanvasProps = {
    className?: string;
    paneControls?: DragPaneControls;
};

export const SvgCanvas = styled(({ className, paneControls }: SvgCanvasProps) => {
    const resolverState = Project.useResolverState();
    const { canvas, contents } = useMemo(() => {
        return Resolver.evaluateRootResult(resolverState);
    }, [resolverState]);

    const boundsRef = useRef<HTMLDivElement>(null);

    return (
        <CanvasViewPane className={className} controls={paneControls} minZoom={0.1} maxZoom={10} boundsRef={boundsRef}>
            <SvgCanvasContent>
                <svg viewBox={`${-canvas.originX} ${-canvas.originY} ${canvas.width} ${canvas.height}`} width={canvas.width} height={canvas.height} style={{ background: canvas.background }}>
                    {contents && renderSVGObject(contents, "root")}
                </svg>
            </SvgCanvasContent>
            <Bounds ref={boundsRef} />
        </CanvasViewPane>
    );
})`
    background: #1a1a1a;
`;

const CanvasViewPane = styled(DragPane)`
    background: #111;
    background-image: url("hexgrid.svg");
    background-blend-mode: overlay;
    border: 3px solid transparent;
    background-position: calc(50% + attr(data-x px) * attr(data-z number)) calc(50% + attr(data-y px) * attr(data-z number));
    background-size: calc(attr(data-z number) * 83.14px) calc(attr(data-z number) * 48px);
    &[data-state~="breach_top"] {
        border-top-color: red;
    }
    &[data-state~="breach_bottom"] {
        border-bottom-color: red;
    }
    &[data-state~="breach_left"] {
        border-left-color: red;
    }
    &[data-state~="breach_right"] {
        border-right-color: red;
    }
    &[data-state~="panning"] {
        cursor:
            url("/viewportPan.svg") 16 16,
            crosshair;
    }

    cursor:
        url("/viewportCursor.svg") 16 16,
        crosshair;

    & > * {
        cursor: auto;
    }
`;

const Bounds = styled.div`
    left: calc(anchor(--svg-canvas left) - 16px);
    right: calc(anchor(--svg-canvas right) - 16px);
    top: calc(anchor(--svg-canvas top) - 16px);
    bottom: calc(anchor(--svg-canvas bottom) - 16px);
    position: absolute;
    pointer-events: none;
    background: #2224;
    z-index: -2;
    border: 1px solid #222;
    outline: 1px solid transparent;
`;

const SvgCanvasContent = styled.div`
    transform: translate(-50%, -50%);
    & > svg {
        anchor-name: --svg-canvas;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        display: block;
    }
`;
