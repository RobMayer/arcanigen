import { CSSProperties, StrictMode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Project } from "./state/project";
import { GraphView } from "./features/primary";
import { Session } from "./state/session";
import styled from "styled-components";
import { NodeDrawer } from "./features/nodedrawer";
import { useDragPane } from "./components/wrappers/DragPane";
import { SvgCanvas } from "./features/svgcanvas";
import { ResizeHandle } from "./components/containers/ResizeHandle";
import { SubgraphEditorProvider } from "./features/subgraph";
import { Toolbar } from "./features/toolbar";

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

    // Suppress the native browser context menu app-wide so our own menus own right-click -- except on editable
    // fields, where the native menu (spellcheck, copy/paste) is still wanted.
    useEffect(() => {
        const onContextMenu = (evt: MouseEvent) => {
            const target = evt.target as HTMLElement | null;
            if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
            evt.preventDefault();
        };
        document.addEventListener("contextmenu", onContextMenu);
        return () => document.removeEventListener("contextmenu", onContextMenu);
    }, []);

    return (
        <Layout ref={layoutRef} style={style} data-state={isDrawerOpen ? "drawer-open" : undefined}>
            <div data-gridarea={"toolbar"}>
                <Toolbar />
            </div>
            <div data-gridarea={"nodegraph"}>
                <GraphView graphId={"root"} paneControls={graphPaneControls} />
            </div>
            <div data-gridarea={"colResize"}>
                <ResizeHandle value={colRatio} containerRef={layoutRef} onValue={handleColDrag} onCommit={setColRatio} mode="dual" />
            </div>
            <div data-gridarea={"rowResize"}>
                <ResizeHandle
                    value={rowRatio}
                    containerRef={layoutRef}
                    onValue={handleRowDrag}
                    onCommit={setRowRatio}
                    orientation={"vertical"}
                    defaultValue={0.7}
                    mode={"single"}
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
                <SubgraphEditorProvider>
                    <Primary />
                </SubgraphEditorProvider>
            </Session.Provider>
        </Project.Provider>
    </StrictMode>,
);

const Layout = styled.div`
    position: fixed;
    inset: 0;
    display: grid;
    grid-template-columns: var(--ratio_L) 2px var(--ratio_R);
    grid-template-rows: min-content 1fr 2px auto;
    padding: 4px;
    gap: 2px;
    grid-template-areas:
        "toolbar toolbar toolbar"
        "nodegraph colResize canvas"
        "rowResize colResize canvas"
        "drawer colResize canvas";
    &[data-state~="drawer-open"] {
        grid-template-rows: min-content 1fr 2px minmax(min-content, var(--ratio_B));
    }
    & > [data-gridarea="colResize"] {
        grid-area: colResize;
    }
    & > [data-gridarea="rowResize"] {
        grid-area: rowResize;
    }
    & > [data-gridarea="toolbar"] {
        grid-area: toolbar;
    }
    & > [data-gridarea="nodegraph"] {
        grid-area: nodegraph;
    }
    & > [data-gridarea="drawer"] {
        grid-area: drawer;
    }
    & > [data-gridarea="canvas"] {
        grid-area: canvas;
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
        position: relative;
        overflow: clip;
        border: 1px solid var(--flavour);
    }
    & > div[data-gridarea="drawer"] {
        display: grid;
        grid-template-rows: auto;
        grid-auto-rows: 1fr;
        gap: 2px;
    }
`;
