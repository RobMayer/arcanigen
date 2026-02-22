import styled from "styled-components";
import { ActionButton } from "../components/buttons/ActionButton";
import { Session } from "../state/session";
import { Icon, ICONS } from "../components/Icon";
import { DecimalInput } from "../components/inputs/DecimalInput";

export const Toolbar = styled(({ className }: { className?: string }) => {
    const [marqueeMode, setMarqueeMode] = Session.useMarqueeMode();
    const [dpi, setDpi] = Session.useExportDpi();

    return (
        <div className={className}>
            <ActionButton>Save Graph</ActionButton>
            <ActionButton>Load Graph</ActionButton>
            <Sep />
            <ActionButton>Import Custom Node</ActionButton>
            <Sep />
            <ActionButton>Export SVG</ActionButton>
            <ActionButton>Export PNG</ActionButton>
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
