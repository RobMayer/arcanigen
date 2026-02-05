import { ReactNode, useEffect, useMemo } from "react";
import { Project } from "../../state/project";
import { SVGObject } from "../../types";
import { Resolver } from "../../util/resolver";
import styled from "styled-components";

const renderSVGObject = (obj: SVGObject, key: string | number): ReactNode => {
    const { tag, attributes, children } = obj;
    const childNodes = children.map((child, i) => renderSVGObject(child, i));

    switch (tag) {
        case "g":
            return (
                <g key={key} {...attributes}>
                    {childNodes}
                </g>
            );
        case "path":
            return <path key={key} {...attributes} />;
        case "svg":
            return (
                <svg key={key} {...attributes}>
                    {childNodes}
                </svg>
            );
    }
};

export const SvgCanvas = styled(({ className }: { className?: string }) => {
    const resolverState = Project.useResolverState();

    useEffect(() => {
        console.log("resolverState changed");
    }, [resolverState]);

    const { canvas, contents } = useMemo(() => {
        return Resolver.evaluateRootResult(resolverState);
    }, [resolverState]);

    return (
        <div className={className}>
            <svg viewBox={`${-canvas.originX} ${-canvas.originY} ${canvas.width} ${canvas.height}`} width={canvas.width} height={canvas.height} style={{ background: canvas.background }}>
                {contents && renderSVGObject(contents, "root")}
            </svg>
        </div>
    );
})`
    display: flex;
    align-items: center;
    justify-content: center;
    background: #1a1a1a;
    overflow: auto;
    padding: 1em;

    & > svg {
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    }
`;
