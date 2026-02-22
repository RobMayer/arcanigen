import { useCallback } from "react";
import styled from "styled-components";
import { ActionButton } from "../components/buttons/ActionButton";
import { Session } from "../state/session";
import { Icon, ICONS } from "../components/Icon";
import { DecimalInput } from "../components/inputs/DecimalInput";
import { Project } from "../state/project";
import { downloadBlob, uploadFile } from "../util/fileIO";

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
            io.load(data);
        });
    }, [io]);

    const handleImport = useCallback(() => {
        void uploadFile(".json").then((text) => {
            const data = JSON.parse(text) as Project.SavedProject;
            if (!data.version || !data.nodes) return;
            io.importSubgraphs(data);
        });
    }, [io]);

    const handleExportSvg = useCallback(() => {
        const svg = document.querySelector("[data-export-svg]");
        if (!svg) return;
        const serializer = new XMLSerializer();
        const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(svg);
        downloadBlob(new Blob([svgString], { type: "image/svg+xml" }), "export.svg");
    }, []);

    const handleExportPng = useCallback(() => {
        const svg = document.querySelector("[data-export-svg]") as SVGSVGElement;
        if (!svg) return;
        const w = svg.width.baseVal.value;
        const h = svg.height.baseVal.value;
        const scale = Number(dpi) / 96;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
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
    }, [dpi]);

    return (
        <div className={className}>
            <ActionButton onClick={handleSave}>Save Graph</ActionButton>
            <ActionButton onClick={handleLoad}>Load Graph</ActionButton>
            <Sep />
            <ActionButton onClick={handleImport}>Import Custom Node</ActionButton>
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
        </div>
    );
})`
    display: flex;
    gap: 6px;
    padding: 2px;
    align-items: center;
    & > button {
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
