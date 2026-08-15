import { useCallback } from "react";
import styled from "styled-components";
import { ActionButton } from "../components/buttons/ActionButton";
import { LinkButton } from "../components/buttons/LinkButton";
import { Session } from "../state/session";
import { Icon, ICONS } from "../components/Icon";
import { DecimalInput } from "../components/inputs/DecimalInput";
import { Project } from "../state/project";
import { downloadBlob, uploadFile } from "../util/fileIO";
import { buildExportSvg } from "../util/fontEmbed";
import { Modal } from "../components/popups/Modal";
import { ChangeLog } from "../changelog";
import { buildShowcaseProject } from "../util/showcaseGraph";

export const Toolbar = styled(({ className }: { className?: string }) => {
    const [marqueeMode, setMarqueeMode] = Session.useMarqueeMode();
    const [dpi, setDpi] = Session.useExportDpi();
    const io = Project.useProjectIO();

    const handleSave = useCallback(() => {
        const data = io.save();
        const json = JSON.stringify(data);
        downloadBlob(new Blob([json], { type: "application/json" }), "project.json");
    }, [io]);

    const handleLoad = useCallback(() => {
        void uploadFile(".json").then((text) => {
            const data = JSON.parse(text) as Project.SavedProject;
            if (!data.version || !data.nodes) return;
            // A saved Custom Node has no "root" graph -- loading it as a project would leave the root view
            // undefined and crash. Steer the user to Import Custom Node instead.
            if (!("root" in data.nodes)) {
                window.alert('This file has no root graph -- it looks like a saved Custom Node.\n\nUse "Import Custom Node" to bring it into the current graph instead.');
                return;
            }
            io.load(data);
        });
    }, [io]);

    const handleImport = useCallback(() => {
        void uploadFile(".json").then((text) => {
            const data = JSON.parse(text) as Project.SavedProject;
            if (!data.version || !data.nodes) return;
            // A full project has a "root" graph; Import expects a saved Custom Node (subgraphs only). Importing
            // a full project would skip its root and silently pull in only its subgraphs, so steer to Load.
            if ("root" in data.nodes) {
                window.alert('This file has a root graph -- it looks like a full project, not a Custom Node.\n\nUse "Load Graph" to open it instead.');
                return;
            }
            io.importSubgraphs(data);
        });
    }, [io]);

    const handleExportSvg = useCallback(() => {
        const svg = document.querySelector("[data-export-svg]") as SVGSVGElement;
        if (!svg) return;
        void buildExportSvg(svg).then((svgString) => {
            downloadBlob(new Blob([svgString], { type: "image/svg+xml" }), "export.svg");
        });
    }, []);

    const handleExportPng = useCallback(() => {
        const svg = document.querySelector("[data-export-svg]") as SVGSVGElement;
        if (!svg) return;
        const w = svg.width.baseVal.value;
        const h = svg.height.baseVal.value;
        const scale = Number(dpi) / 96;

        void buildExportSvg(svg).then((svgString) => {
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(w * scale);
                canvas.height = Math.round(h * scale);
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                canvas.toBlob((pngBlob) => {
                    if (pngBlob) downloadBlob(pngBlob, "export.png");
                }, "image/png");
            };
            img.src = url;
        });
    }, [dpi]);

    const handleShowcase = useCallback(() => {
        if (!window.confirm("Replace the current graph with the node showcase? Unsaved work will be lost.")) return;
        io.load(buildShowcaseProject(io.save().version));
    }, [io]);

    const changelogControls = Modal.useControls();

    return (
        <div className={className}>
            <ActionButton onClick={handleSave}>Save Graph</ActionButton>
            <ActionButton onClick={handleLoad}>Load Graph</ActionButton>
            <Sep />
            <ActionButton onClick={handleImport}>Import Custom Node</ActionButton>
            {import.meta.env.DEV && <ActionButton onClick={handleShowcase}>Node Showcase</ActionButton>}
            <Sep />
            <ActionButton onClick={handleExportSvg}>Export SVG</ActionButton>
            <ActionButton onClick={handleExportPng}>Export PNG</ActionButton>
            <DpiControl>
                <span>Export DPI:</span>
                <DecimalInput value={dpi} onCommit={setDpi} min={"16"} required />
            </DpiControl>
            <Sep />
            <ActionButton onClick={() => setMarqueeMode((p) => (p === "contain" ? "intersect" : "contain"))} tooltip={`Selection Mode: ${marqueeMode === "contain" ? "Contain" : "Intersect"}`}>
                <Icon shape={marqueeMode === "contain" ? ICONS.SelectBounds.Contain : ICONS.SelectBounds.Intersect} />
            </ActionButton>
            <Spacer />
            <div>
                v{APP_VERSION} [{BUILD_DATE}]
            </div>
            <LinkButton href="https://www.youtube.com/watch?v=8as5Jh1xs1M&list=PLAKrIav6IfnEVC7URg6PoC1c9ym8pJQrj" target="_blank" rel="noopener noreferrer">
                Vlog + Help
            </LinkButton>
            <LinkButton href="https://github.com/RobMayer/arcanigen" target="_blank" rel="noopener noreferrer">
                Github
            </LinkButton>
            <ActionButton onClick={changelogControls.open}>Change Log</ActionButton>
            <Modal controls={changelogControls} size="640px fit">
                <Modal.Title
                    options={
                        <>
                            <ActionButton.Lite onClick={changelogControls.close} flavour={"danger"}>
                                <Icon shape={ICONS.Close} />
                            </ActionButton.Lite>
                        </>
                    }
                >
                    Change Log
                </Modal.Title>
                <ChangeLog />
            </Modal>
        </div>
    );
})`
    display: flex;
    gap: 6px;
    padding: 2px;
    align-items: center;
    & > button,
    & > a {
        padding: 0.25em;
    }
`;

const Sep = styled.div`
    align-self: stretch;
    width: 1px;
    border-left: 1px solid #666;
    margin-inline: 6px;
`;

const Spacer = styled.div`
    flex: 1 1 0;
`;

const DpiControl = styled.div`
    display: flex;
    gap: 6px;
    align-items: center;
`;
