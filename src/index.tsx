import { CSSProperties, Dispatch, Ref, RefObject, SetStateAction, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Project } from "./state/project";
import { GraphView } from "./features/primary";
import { Session } from "./state/session";
import styled from "styled-components";
import { useStable } from "./util/hooks/useStable";
import { NodeDrawer } from "./features/nodedrawer";
import { useDragPane } from "./components/wrappers/DragPane";

window.onfocus = () => {
    document.dispatchEvent(new CustomEvent("trh:pagefocus"));
};

const Primary = () => {
    const layoutRef = useRef<HTMLDivElement>(null);

    const [ratio, setRatio] = useState<number>(0.5);

    const style = useMemo(() => {
        return {
            "--ratio_L": `${ratio}fr`,
            "--ratio_R": `${1 - ratio}fr`,
        } as CSSProperties;
    }, [ratio]);

    const graphPaneControls = useDragPane();

    return (
        <Layout ref={layoutRef} style={style}>
            <div data-gridarea={"toolbar"}>Hi</div>
            <div data-gridarea={"nodegraph"}>
                <GraphView graphId={"root"} paneControls={graphPaneControls} />
            </div>
            <div data-gridarea={"resize"}>
                <Handle onChange={setRatio} layoutRef={layoutRef} />
            </div>
            <div data-gridarea={"drawer"}>
                <NodeDrawer graphId={"root"} paneControls={graphPaneControls} />
            </div>
            <div data-gridarea={"canvas"}></div>
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
    grid-template-rows: auto 1fr auto;
    padding: 4px;
    gap: 2px;
    grid-template-areas:
        "toolbar toolbar toolbar"
        "nodegraph resize canvas"
        "drawer resize canvas";
    & > div {
        grid-area: attr(data-gridarea type(<custom-ident>));
    }
    & > div[data-gridarea="resize"] {
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

const Handle = styled(({ onChange, layoutRef, className }: { onChange: Dispatch<SetStateAction<number>>; layoutRef: RefObject<HTMLDivElement | null>; className?: string }) => {
    const onChangeRef = useStable(onChange);
    const handleRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = handleRef.current;
        const layout = layoutRef.current;
        if (el && layout) {
            let startX = 0;
            let startRatio = 0;

            const mouseMove = (evt: MouseEvent) => {
                const layoutRect = layout.getBoundingClientRect();
                const delta = (evt.clientX - startX) / layoutRect.width;
                const ratio = startRatio + delta;
                const clamped = Math.max(0.2, Math.min(0.8, ratio));
                layout.style.setProperty("--ratio_L", `${clamped}fr`);
                layout.style.setProperty("--ratio_R", `${1 - clamped}fr`);
            };

            const mouseUp = (evt: MouseEvent) => {
                const layoutRect = layout.getBoundingClientRect();
                const delta = (evt.clientX - startX) / layoutRect.width;
                const ratio = startRatio + delta;
                const clamped = Math.max(0.2, Math.min(0.8, ratio));
                onChangeRef.current(clamped);
                document.removeEventListener("mousemove", mouseMove);
                document.removeEventListener("mouseup", mouseUp);
            };

            const mouseDown = (evt: MouseEvent) => {
                if (evt.detail > 1) return; // ignore double-click
                startX = evt.clientX;
                // Parse the current ratio directly from the CSS variable (source of truth)
                const currentRatioStr = layout.style.getPropertyValue("--ratio_L");
                startRatio = parseFloat(currentRatioStr) || 0.5;
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
    }, [layoutRef]);

    const reset = useCallback(() => {
        onChangeRef.current(0.5);
    }, []);

    return (
        <div className={className} ref={handleRef} data-flavour={"accent"} onDoubleClick={reset}>
            <div />
        </div>
    );
})`
    height: 25%;
    position: absolute;
    align-self: center;
    left: -6px;
    right: -6px;
    border-radius: 100vw;
    corner-shape: bevel;
    cursor: col-resize;
    display: grid;

    & > div {
        background: oklch(from var(--flavour) calc(l + 0.1) c h);
        align-self: center;
        justify-self: center;
        width: 2px;
        height: 100%;
    }
`;
