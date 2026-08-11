import { useMemo, useRef } from "react";
import { Project } from "../../state/project";
import styled from "styled-components";
import { DragPane, DragPaneControls } from "../../components/wrappers/DragPane";
import { ShapeElement } from "../shapeRenderer";
import { ResultDefinition } from "../../definitions/nodes/resultNode";
import { NodeDefinitions } from "../../definitions/nodeTypes";
import { Length } from "../../definitions/datatypes/length";
import { Color } from "../../definitions/datatypes/color";
import { Shape } from "../../definitions/shapeTypes";

type SvgCanvasProps = {
    className?: string;
    paneControls?: DragPaneControls;
};

export const SvgCanvas = styled(({ className, paneControls }: SvgCanvasProps) => {
    const [resultNode] = Project.useNode("root", "RESULT");

    const node = resultNode as unknown as NodeDefinitions.NodeFor<ResultDefinition>;
    const shapeEval = Project.useCachedInput<ResultDefinition, "input">("root", node, "input");
    const wEval = Project.useCachedInput<ResultDefinition, "w">("root", node, "w");
    const hEval = Project.useCachedInput<ResultDefinition, "h">("root", node, "h");
    const xEval = Project.useCachedInput<ResultDefinition, "x">("root", node, "x");
    const yEval = Project.useCachedInput<ResultDefinition, "y">("root", node, "y");
    const colorEval = Project.useCachedInput<ResultDefinition, "color">("root", node, "color");

    const payload = resultNode.payload as ResultDefinition["payload"];

    const { canvas, contents } = useMemo(() => {
        const width = Length.Emptyable.asNumber(wEval?.data ?? payload.w ?? "800px") ?? 800;
        const height = Length.Emptyable.asNumber(hEval?.data ?? payload.h ?? "800px") ?? 800;
        const originX = Length.Emptyable.asNumber(xEval?.data ?? payload.x ?? "0px") ?? 0;
        const originY = Length.Emptyable.asNumber(yEval?.data ?? payload.y ?? "0px") ?? 0;
        const backgroundColor = colorEval?.data ?? payload.color ?? null;
        const background = backgroundColor === null ? "none" : Color.toHex(backgroundColor);
        const contents: Shape | null = shapeEval?.data ?? null;

        return {
            canvas: { width, height, originX: width / 2 + originX, originY: height / 2 + originY, background },
            contents,
        };
    }, [shapeEval, wEval, hEval, xEval, yEval, colorEval, payload.w, payload.h, payload.x, payload.y, payload.color]);

    const boundsRef = useRef<HTMLDivElement>(null);

    return (
        <CanvasViewPane className={className} controls={paneControls} minZoom={0.1} maxZoom={10} boundsRef={boundsRef}>
            <SvgCanvasContent>
                <div>
                    <svg
                        data-export-svg
                        viewBox={`${-canvas.originX} ${-canvas.originY} ${canvas.width} ${canvas.height}`}
                        width={canvas.width}
                        height={canvas.height}
                        style={{ background: canvas.background, pointerEvents: "none" }}
                    >
                        {contents && <ShapeElement shape={contents} />}
                    </svg>
                </div>
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
    background-position: calc(50% + var(--x) * var(--z)) calc(50% + var(--y) * var(--z));
    background-size: calc(var(--z) * 83.14px) calc(var(--z) * 48px);

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
    left: calc(anchor(--svg-canvas left, 0px) - 16px);
    right: calc(anchor(--svg-canvas right, 0px) - 16px);
    top: calc(anchor(--svg-canvas top, 0px) - 16px);
    bottom: calc(anchor(--svg-canvas bottom, 0px) - 16px);
    position: absolute;
    pointer-events: none;
    background: #2224;
    z-index: -2;
    border: 1px solid #222;
    outline: 1px solid transparent;
`;

const SvgCanvasContent = styled.div`
    width: 0;
    height: 0;
    display: grid;
    display: grid;
    place-items: center;
    place-content: center;
    & > div > svg {
        anchor-name: --svg-canvas;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        display: block;
    }
`;
