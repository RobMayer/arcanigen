import { ReactNode } from "react";
import styled from "styled-components";
import { Flavour } from "../types";

const Base = styled.div`
    flex: 1 1;
    gap: 1px;
    background: #000;
    padding: 1px;
    border: 1px solid va(--flavour);
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    &[data-orientation="horizontal"] {
        grid-auto-flow: column;
    }
`;

export const InputGroup = ({
    children,
    orientation = "vertical",
    flavour = "base",
    className,
}: {
    children?: ReactNode;
    orientation?: "horizontal" | "vertical";
    className?: string;
    flavour?: Flavour;
}) => {
    return (
        <Base className={className} data-orientation={orientation} data-flavour={flavour}>
            {children}
        </Base>
    );
};
