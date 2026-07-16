import { ReactNode } from "react";
import styled from "styled-components";

export const ChangeLog = ({ className }: { className?: string }) => {
    return (
        <Body className={className}>
            <Build date={"2026-07-16"} version={"3.2.6"}>
                <Bugfix>Fixed Text Paths not showing up with the correct font in the preview.</Bugfix>
            </Build>
            <Build date={"2026-05-12"} version={"3.2.5"}>
                <Improvement>Space + Left-click-drag also moves the canvas</Improvement>
            </Build>
            <Build date={"2026-05-12"} version={"3.2.4"}>
                <Improvement>Added Color Join and Color Split nodes</Improvement>
            </Build>
            <Build date={"2026-05-11"} version={"3.2.3"}>
                <Improvement>Added a preview thingy to math and logic nodes</Improvement>
            </Build>
            <Build date={"2026-04-11"} version={"3.2.2"}>
                <Bugfix>Fixed drag-distance of nodes and some CSS inheritence in Brave</Bugfix>
            </Build>
            <Build date={"2026-03-07"} version={"3.2.1"}>
                <Bugfix>Firefox position anchoring issue.</Bugfix>
            </Build>
            <Build date={"2026-02-28"} version={"3.2.0"}>
                <Improvement>More performant canvas zoom</Improvement>
                <Improvement>Node and Accordion state now persist in saved files</Improvement>
            </Build>
            <Build date={"2026-02-27"} version={"3.1.8"}>
                <Bugfix>Less than and Less-than-or-equal node icons were swapped</Bugfix>
            </Build>
            <Build date={"2026-02-27"} version={"3.1.7"}>
                <Improvement>Unified the Arc, Radial Array, and Spiral options (Start/Sweep vs From/To).</Improvement>
                <Improvement>Added some horizontal-rules to a few nodes for organization</Improvement>
            </Build>
            <Build date={"2026-02-27"} version={"3.1.6"}>
                <Bugfix>Node positions weren&apos;t being saved in subgraphs</Bugfix>
                <Bugfix>Not all selected nodes were moving in subgraphs</Bugfix>
                <Bugfix>Containers wouldn&apos;t move their contained nodes in subgraphs</Bugfix>
            </Build>
            <Build date={"2026-02-26"} version={"3.1.5"}>
                <Feature>Added the Glow effect node.</Feature>
            </Build>
            <Build date={"2026-02-25"} version={"3.1.4"}>
                <Bugfix>Clicking on a node didn&apos;t *actually* select it, it just looked selected</Bugfix>
                <Feature>Added the Container Node.</Feature>
            </Build>
            <Build date={"2026-02-25"} version={"3.1.3"}>
                <Bugfix>From Path node was missing stroke join</Bugfix>
            </Build>
            <Build date={"2026-02-24"} version={"3.1.2"}>
                <Feature>Added a real starting state</Feature>
                <Bugfix>Multiple selected nodes weren&apos;t dragging correctly</Bugfix>
            </Build>
            <Build date={"2026-02-24"} version={"3.1.1"}>
                <Feature>Added Opacity to all relevant Shape nodes</Feature>
            </Build>
            <Build date={"2026-02-24"} version={"3.1.0"}>
                <Improvement>Changed how transparent color values are handled with inputs</Improvement>
                <Feature>Added &quot;isNullish&quot; boolean node</Feature>
            </Build>
            <Build date={"2026-02-24"} version={"3.0.5"}>
                <Feature>Added Changelog</Feature>
                <Bugfix>Certain shapes would not render when first connected.</Bugfix>
                <Bugfix>Value nodes could exceed the min/max/step constraints of their sockets</Bugfix>
            </Build>
        </Body>
    );
};

const Build = ({ version, date, children }: { version: string; date: string; children?: ReactNode }) => {
    return (
        <>
            <dt>
                <span>v{version}</span>
                <span>{date}</span>
            </dt>
            {children}
        </>
    );
};

const Bugfix = ({ children }: { children?: ReactNode }) => {
    return (
        <dd>
            <span data-part={"badge"} data-flavour={"danger"}>
                Bug Fix
            </span>
            {children}
        </dd>
    );
};

const Feature = ({ children }: { children?: ReactNode }) => {
    return (
        <dd>
            <span data-part={"badge"} data-flavour={"confirm"}>
                Feature
            </span>
            {children}
        </dd>
    );
};

const Improvement = ({ children }: { children?: ReactNode }) => {
    return (
        <dd>
            <span data-part={"badge"} data-flavour={"info"}>
                Improvement
            </span>
            {children}
        </dd>
    );
};

const Body = styled.dl`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;

    & > dt {
        display: flex;
        justify-content: space-between;
        background: #333;
        padding: 6px 12px;
        font-size: 125%;
    }
    & > dd {
        display: flex;
        gap: 8px;
    }
    & > dd > [data-part="badge"] {
        display: inline-flex;
        width: 128px;
        justify-content: center;
        background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
        color: oklch(from var(--flavour) calc(l + 0.3) c h);
        font-weight: bold;
        font-variant: small-caps;
        align-self: stretch;
        flex: 0 0 auto;
    }
`;
