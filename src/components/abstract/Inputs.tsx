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

export const AbstractSliderInput = styled(({ tooltip, flavour = "accent", ...props }: AbstractInputProps) => {
    return <input {...props} type={"range"} title={tooltip} data-flavour={flavour} />;
})`
    flex: 1 1;
    outline: none;
    padding: 2px;
    isolation: isolate;
    &:disabled {
        opacity: 0.6;
    }
    min-width: 0;
    background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
    border: 1px solid var(--flavour);
    border-radius: 100vw;
    -webkit-appearance: none; /* Hides the slider so that custom slider can be made */
    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        height: calc(1em + (1lh - 1em) / 2);
        width: calc(1em + (1lh - 1em) / 2);
        background: var(--flavour);
        cursor: ew-resize;
        border-radius: 100%;
        z-index: 1;
        outline: 1px solid transparent;
        outline-offset: 0px;
        transition: outline-offset 0.1s ease;
    }
    &:focus-visible {
        &::-webkit-slider-thumb {
            outline-color: #fffa;
            outline-offset: 2px;
        }
    }
    &:not(:disabled) {
        &::-webkit-slider-thumb:hover,
        &::-webkit-slider-thumb:active {
            background: oklch(from var(--flavour) calc(l + 0.1) c h);
        }
    }
`;

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
