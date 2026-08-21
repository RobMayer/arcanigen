import { PointerEvent as ReactPointerEvent, useCallback } from "react";
import styled from "styled-components";
import { ActionButton } from "../buttons/ActionButton";
import { Icon, ICONS } from "../Icon";
import { DragPaneControls } from "./DragPane";

type DragPaneToolbarProps = {
    className?: string;
    controls: DragPaneControls;
    // Graph-only actions. When omitted (e.g. the SVG view, which has no selection) their buttons are hidden.
    onZoomSelected?: () => void;
    onPanSelected?: () => void;
    // Disables the selected-variant buttons (e.g. when nothing is selected).
    selectedDisabled?: boolean;
};

// nub sensitivity: pan is a 1:1-ish screen drag, zoom is a gentle exponential nudge per pixel of vertical travel.
const PAN_NUB_SPEED = 2;
const ZOOM_NUB_SPEED = 0.01;

const bindNubDrag = (evt: ReactPointerEvent<HTMLButtonElement>, onMove: (e: PointerEvent) => void) => {
    if (evt.button !== 0) return;
    evt.preventDefault();
    const el = evt.currentTarget;
    el.setPointerCapture(evt.pointerId);
    const move = (e: PointerEvent) => onMove(e);
    const up = (e: PointerEvent) => {
        el.releasePointerCapture(e.pointerId);
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
};

const ICON_ZOOMFIT = [ICONS.Zoom, ICONS.Extents];

export const DragPaneToolbar = styled(({ className, controls, onZoomSelected, onPanSelected, selectedDisabled }: DragPaneToolbarProps) => {
    const handleZoomAll = useCallback(() => controls.extents(), [controls]);
    const handlePanAll = useCallback(() => controls.center(), [controls]);
    const handleReset = useCallback(() => controls.zoomTo(1), [controls]);

    const handlePanNub = useCallback(
        (evt: ReactPointerEvent<HTMLButtonElement>) => {
            bindNubDrag(evt, (e) => controls.panBy({ x: e.movementX * PAN_NUB_SPEED, y: e.movementY * PAN_NUB_SPEED }));
        },
        [controls],
    );

    const handleZoomNub = useCallback(
        (evt: ReactPointerEvent<HTMLButtonElement>) => {
            bindNubDrag(evt, (e) => controls.zoomBy(1 - e.movementY * ZOOM_NUB_SPEED));
        },
        [controls],
    );

    return (
        <div className={className}>
            <ActionButton.Lite tooltip={"Zoom to Fit (All)"} onClick={handleZoomAll}>
                <Icon shape={ICONS.Extents} layer={ICONS.Zoom} cutout={"circle"} layerColor={"#fff"} />
            </ActionButton.Lite>
            {onZoomSelected && (
                <ActionButton.Lite tooltip={"Zoom to Fit (Selected)"} onClick={onZoomSelected} disabled={selectedDisabled}>
                    <Icon shape={ICONS.ExtentsSelected} layer={ICONS.Zoom} cutout={"circle"} layerColor={"#fff"} />
                </ActionButton.Lite>
            )}
            <Sep />
            <ActionButton.Lite tooltip={"Center View (All)"} onClick={handlePanAll}>
                <Icon shape={ICONS.Extents} layer={ICONS.Translate} cutout={"circle"} layerColor={"#fff"} />
            </ActionButton.Lite>
            {onPanSelected && (
                <ActionButton.Lite tooltip={"Center View (Selected)"} onClick={onPanSelected} disabled={selectedDisabled}>
                    <Icon shape={ICONS.ExtentsSelected} layer={ICONS.Translate} cutout={"circle"} layerColor={"#fff"} />
                </ActionButton.Lite>
            )}
            <Sep />
            <ActionButton.Lite tooltip={"Reset Zoom (100%)"} onClick={handleReset}>
                <Icon shape={ICONS.Zoom} layer={ICONS.Rotate} cutout={"circle"} layerColor={"#fff"} />
            </ActionButton.Lite>
            <Sep />
            <Nub flavour={"emphasis"} tooltip={"Drag to Pan"} onPointerDown={handlePanNub}>
                <Icon shape={ICONS.Translate} />
            </Nub>
            <Nub flavour={"emphasis"} tooltip={"Drag to Zoom"} onPointerDown={handleZoomNub}>
                <Icon shape={ICONS.Zoom} />
            </Nub>
        </div>
    );
})`
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    display: flex;
    gap: 4px;
    padding: 4px;
    align-items: center;
    border-radius: 8px;
    background: #fff1;
    border: 1px solid #000;
    backdrop-filter: blur(4px);
    box-shadow: 0px 2px 4px black;
    /* let clicks fall through the panel gaps to the pane; only the buttons are interactive */
    pointer-events: none;
    & > * {
        pointer-events: auto;
    }
    & > button {
        padding: 0.25em;
    }
`;

const Sep = styled.div`
    align-self: stretch;
    width: 1px;
    border-left: 1px solid #666;
    margin-inline: 2px;
    pointer-events: none;
`;

const Nub = styled(ActionButton.Lite)`
    cursor: grab;
    touch-action: none;
    &:active {
        cursor: grabbing;
    }
`;
