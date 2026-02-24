import { ReactNode } from "react";
import styled from "styled-components";

export const ChangeLog = () => {
    return <></>;
};

const Build = styled(({ date, children, className }: { date: string; children?: ReactNode; className?: string }) => {
    return (
        <div className={className}>
            <div data-part={"date"}>{date}</div>
            <div data-part={"items"}>{children}</div>
        </div>
    );
})``;
