import { ReactNode } from "react";
import styled from "styled-components";

export const ChangeLog = ({ className }: { className?: string }) => {
    return (
        <Body className={className}>
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
