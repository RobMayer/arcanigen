import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";

export const TextInput = styled((props: AbstractInput.Text.Props) => {
    return <AbstractInput.Text {...props} />;
})``;
