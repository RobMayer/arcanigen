import { DetailedHTMLProps, InputHTMLAttributes } from "react";
import styled from "styled-components";

const AbstractInput = styled.input`
    background: #111;
    padding: 0.25em 0.5em;
    font-family: monospace;
    border: 1px solid #666;
    outline: 1px solid transparent;
    outline-offset: 1px;
    &:focus-visible {
        outline-color: #fff;
    }
    &:invalid {
        outline-color: #f00;
        background-color: #200;
    }
    &:invalid:focus-visible {
        outline-color: #f88;
    }
    &:disabled {
        opacity: 0.7;
    }
`;

export const AbstractTextInput = styled((props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
    return <AbstractInput {...props} type={"text"} />;
})``;

export const AbstractNumberInput = styled((props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
    return <AbstractInput {...props} type={"number"} />;
})``;

export const AbstractSliderInput = styled((props: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>) => {
    return <input {...props} type={"range"} />;
})``;
