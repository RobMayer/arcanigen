import styled from "styled-components";
import { AbstractLiteButton, AbstractButton } from "../abstract/button";
import { merge } from "../../util/misc";

const Primary = styled(AbstractButton)``;
const Lite = styled(AbstractLiteButton)``;

export const ActionButton = merge(Primary, { Lite });
