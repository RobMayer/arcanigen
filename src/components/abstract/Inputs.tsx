import { DetailedHTMLProps, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import styled from "styled-components";
import { Flavour } from "../types";

export type AbstractInputProps = Omit<DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };
export type AbstractSelectProps = Omit<DetailedHTMLProps<SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>, "title"> & { tooltip?: string; flavour?: Flavour | "inherit" };

const AbstractInput = styled.input`
    background: #111;
    padding: 0.25em 0.4em;
    font-family: monospace;
    border: 1px solid #666;
    outline: 1px solid transparent;
    outline-offset: 0px;
    transition: outline-offset 0.1s ease;
    &:focus-visible {
        outline-color: #fffa;
        outline-offset: -2px;
    }
    &:invalid {
        outline-color: #f00;
        background-color: #200;
    }
    &:invalid:focus-visible {
        outline-color: #f88;
    }
    &:disabled {
        opacity: 0.6;
    }
    min-width: 0;
    flex: 1 1;
`;

export const AbstractTextInput = styled(({ tooltip, flavour, ...props }: AbstractInputProps) => {
    return <AbstractInput {...props} type={"text"} title={tooltip} data-flavour={flavour} />;
})``;

export const AbstractNumberInput = styled(({ tooltip, flavour, ...props }: AbstractInputProps) => {
    return <AbstractInput {...props} type={"text"} title={tooltip} data-flavour={flavour} />;
})``;

export const AbstractSliderInput = styled(({ tooltip, flavour, ...props }: AbstractInputProps) => {
    return <input {...props} type={"range"} title={tooltip} data-flavour={flavour} />;
})``;

export const AbstractSelect = styled(({ tooltip, flavour, ...props }: AbstractSelectProps) => {
    return <select {...props} title={tooltip} data-flavour={flavour} />;
})`
    background: #111;
    padding: 0.25em 0.4em;
    font-family: monospace;
    border: 1px solid #666;
    outline: 1px solid transparent;
    outline-offset: 0px;
    transition: outline-offset 0.1s ease;
    &:focus-visible {
        outline-color: #fffa;
        outline-offset: -2px;
    }
    &:disabled {
        opacity: 0.6;
    }
    min-width: 0;
    flex: 1 1;
`;
