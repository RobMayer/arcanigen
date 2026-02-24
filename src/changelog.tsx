import { ReactNode } from "react";
import styled from "styled-components";

export const ChangeLog = ({ className }: { className?: string }) => {
    return (
        <Body className={className}>
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
