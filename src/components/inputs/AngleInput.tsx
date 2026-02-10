import styled from "styled-components";
import { AbstractInput } from "../abstract/Inputs";

export const AngleInput = styled(({ min = 0, max = 360, unbound, ...props }: Omit<AbstractInput.Numeric.Props, "wrap"> & { unbound?: boolean }) => {
    return <AbstractInput.Numeric {...props} wrap={unbound ? undefined : 360} min={min} max={max} />;
})``;
