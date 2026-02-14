import { CSSProperties, RefObject, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Project } from "./state/project";
import { GraphView } from "./features/primary";
import { Session } from "./state/session";
import styled from "styled-components";
import { useStable } from "./util/hooks/useStable";
import { NodeDrawer } from "./features/nodedrawer";
import { useDragPane } from "./components/wrappers/DragPane";
import { SvgCanvas } from "./features/svgcanvas";

window.onfocus = () => {
    document.dispatchEvent(new CustomEvent("trh:pagefocus"));
};

const Primary = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(true);

    const layoutRef = useRef<HTMLDivElement>(null);

    const [colRatio, setColRatio] = useState<number>(0.5);
    const [rowRatio, setRowRatio] = useState<number>(0.8);

    const style = useMemo(() => {
        return {
            "--ratio_L": `${colRatio}fr`,
            "--ratio_R": `${1 - colRatio}fr`,
            "--ratio_T": `${rowRatio}fr`,
            "--ratio_B": `${1 - rowRatio}fr`,
        } as CSSProperties;
    }, [colRatio, rowRatio]);

    const handleColDrag = useCallback((r: number) => {
        const layout = layoutRef.current;
        if (layout) {
            layout.style.setProperty("--ratio_L", `${r}fr`);
            layout.style.setProperty("--ratio_R", `${1 - r}fr`);
        }
    }, []);

    const handleRowDrag = useCallback((r: number) => {
        const layout = layoutRef.current;
        if (layout) {
            layout.style.setProperty("--ratio_T", `${r}fr`);
            layout.style.setProperty("--ratio_B", `${1 - r}fr`);
        }
    }, []);

    const graphPaneControls = useDragPane();

    return (
        <Layout ref={layoutRef} style={style} data-state={isDrawerOpen ? "drawer-open" : undefined}>
            <div data-gridarea={"toolbar"}>Hi</div>
            <div data-gridarea={"nodegraph"}>
                <GraphView graphId={"root"} paneControls={graphPaneControls} />
            </div>
            <div data-gridarea={"colResize"}>
                <Handle value={colRatio} containerRef={layoutRef} onValue={handleColDrag} onCommit={setColRatio} />
            </div>
            <div data-gridarea={"rowResize"}>
                <Handle
                    value={rowRatio}
                    containerRef={layoutRef}
                    onValue={handleRowDrag}
                    onCommit={setRowRatio}
                    orientation={"vertical"}
                    defaultValue={0.7}
                    min={0.3}
                    max={0.9}
                    disabled={!isDrawerOpen}
                />
            </div>
            <div data-gridarea={"drawer"}>
                <NodeDrawer graphId={"root"} paneControls={graphPaneControls} isOpen={isDrawerOpen} onOpenToggle={setIsDrawerOpen} />
            </div>
            <div data-gridarea={"canvas"}>
                <SvgCanvas />
            </div>
        </Layout>
    );
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Project.Provider>
            <Session.Provider>
                <Primary />
            </Session.Provider>
        </Project.Provider>
    </StrictMode>,
);

const Layout = styled.div`
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-columns: var(--ratio_L) 2px var(--ratio_R);
    grid-template-rows: auto 1fr 2px auto;
    padding: 4px;
    gap: 2px;
    grid-template-areas:
        "toolbar toolbar toolbar"
        "nodegraph colResize canvas"
        "rowResize colResize canvas"
        "drawer colResize canvas";
    &[data-state~="drawer-open"] {
        grid-template-rows: auto var(--ratio_T) 2px var(--ratio_B);
    }
    & > div {
        grid-area: attr(data-gridarea type(<custom-ident>));
    }
    & > div[data-gridarea="colResize"],
    & > div[data-gridarea="rowResize"] {
        display: flex;
        overflow: visible;
        z-index: 1;
        position: relative;
    }
    & > div[data-gridarea="nodegraph"],
    & > div[data-gridarea="canvas"] {
        contain: paint;
        border: 1px solid var(--flavour);
    }
    & > div[data-gridarea="drawer"] {
        display: grid;
        grid-template-rows: auto;
        grid-auto-rows: 1fr;
        gap 2px;
    }
`;

const Handle = styled(
    ({
        value,
        containerRef,
        onValue,
        onCommit,
        orientation = "horizontal",
        min = 0.2,
        max = 0.8,
        defaultValue = 0.5,
        disabled,
        className,
    }: {
        value: number;
        containerRef: RefObject<HTMLElement | null>;
        onValue?: (ratio: number) => void;
        onCommit?: (ratio: number) => void;
        orientation?: "horizontal" | "vertical";
        min?: number;
        max?: number;
        defaultValue?: number;
        disabled?: boolean;
        className?: string;
    }) => {
        const onValueRef = useStable(onValue);
        const onCommitRef = useStable(onCommit);
        const valueRef = useStable(value);
        const disabledRef = useStable(disabled);
        const handleRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            const el = handleRef.current;
            const container = containerRef.current;
            if (el && container) {
                const horizontal = orientation === "horizontal";
                let startPos = 0;
                let startRatio = 0;

                const getRatio = (evt: MouseEvent) => {
                    const rect = container.getBoundingClientRect();
                    const delta = horizontal ? (evt.clientX - startPos) / rect.width : (evt.clientY - startPos) / rect.height;
                    return Math.max(min, Math.min(max, startRatio + delta));
                };

                const mouseMove = (evt: MouseEvent) => {
                    onValueRef.current?.(getRatio(evt));
                };

                const mouseUp = (evt: MouseEvent) => {
                    onCommitRef.current?.(getRatio(evt));
                    document.removeEventListener("mousemove", mouseMove);
                    document.removeEventListener("mouseup", mouseUp);
                };

                const mouseDown = (evt: MouseEvent) => {
                    if (evt.detail > 1 || disabledRef.current) return;
                    startPos = horizontal ? evt.clientX : evt.clientY;
                    startRatio = valueRef.current;
                    document.addEventListener("mousemove", mouseMove);
                    document.addEventListener("mouseup", mouseUp);
                };

                el.addEventListener("mousedown", mouseDown);
                return () => {
                    el.removeEventListener("mousedown", mouseDown);
                    document.removeEventListener("mouseup", mouseUp);
                    document.removeEventListener("mousemove", mouseMove);
                };
            }
        }, [containerRef, orientation, min, max]);

        const reset = useCallback(() => {
            onCommitRef.current?.(defaultValue);
        }, [defaultValue]);

        return (
            <div className={className} ref={handleRef} data-flavour={"accent"} data-orientation={orientation} data-state={disabled ? "disabled" : undefined} onDoubleClick={reset}>
                <div />
            </div>
        );
    },
)`
    position: absolute;
    border-radius: 100vw;
    corner-shape: bevel;
    display: grid;
    place-items: center;

    &[data-orientation="horizontal"] {
        height: 25%;
        align-self: center;
        left: -6px;
        right: -6px;
        cursor: col-resize;

        & > div {
            width: 2px;
            height: 100%;
        }
    }

    &[data-orientation="vertical"] {
        width: 25%;
        justify-self: center;
        top: -6px;
        bottom: -6px;
        left: 0;
        right: 0;
        cursor: row-resize;

        & > div {
            height: 2px;
            width: 100%;
        }
    }

    &[data-state~="disabled"] {
        pointer-events: none;
        opacity: 0.4;
        filter: saturate(0);
    }

    & > div {
        background: oklch(from var(--flavour) calc(l + 0.1) c h);
        align-self: center;
        justify-self: center;
    }
`;
