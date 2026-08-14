import { ReactNode } from "react";
import styled from "styled-components";
import { Icon, ICONS } from "../Icon";
import { LengthInput } from "./LengthInput";
import { AngleInput } from "./AngleInput";
import { LoopButton } from "../buttons/LoopButton";
import { Enum } from "../../definitions/datatypes/enum";
import { Length } from "../../definitions/datatypes/length";
import { Angle } from "../../definitions/datatypes/angle";
import { EmptyOr } from "../../util/misc";

// A compact inline point editor: a Cartesian/Polar toggle plus the two fields for the active mode.
// The mode is data-entry convenience only -- the stored value is always cartesian {x,y} once resolved.
// Mirrors the Transform node's position row; factored out because the point-math nodes all repeat it.

const MODE_OPTIONS = [
    { value: `${Enum.Common.positionMode.CARTESIAN.value}`, label: <Icon shape={ICONS.Coordinates.Cartesian} /> },
    { value: `${Enum.Common.positionMode.POLAR.value}`, label: <Icon shape={ICONS.Coordinates.Polar} /> },
];

const Row = styled.div`
    display: flex;
    align-items: center;
    gap: 3px;
    width: 100%;

    & > .pointField {
        flex: 1 1 0;
        width: 0;
        min-width: 0;
    }
`;

export function PointInput({ value, onChange, disabled = false }: PointInput.Props): ReactNode {
    const isPolar = value.mode === Enum.Common.positionMode.POLAR.value;
    return (
        <Row>
            <LoopButton.Lite value={`${value.mode}`} options={MODE_OPTIONS} onValue={(v) => onChange({ mode: Number(v) })} disabled={disabled} />
            {isPolar ? (
                <>
                    <LengthInput className={"pointField"} value={value.radius} onCommit={(radius) => onChange({ radius })} disabled={disabled} required />
                    <AngleInput className={"pointField"} value={value.theta} onCommit={(theta) => onChange({ theta })} disabled={disabled} />
                </>
            ) : (
                <>
                    <LengthInput className={"pointField"} value={value.x} onCommit={(x) => onChange({ x })} disabled={disabled} required />
                    <LengthInput className={"pointField"} value={value.y} onCommit={(y) => onChange({ y })} disabled={disabled} required />
                </>
            )}
        </Row>
    );
}

export namespace PointInput {
    // Structurally identical to PointHelper.Authoring -- the value a point socket falls back to when disconnected.
    export type Value = {
        mode: number;
        x: EmptyOr<Length.Type>;
        y: EmptyOr<Length.Type>;
        radius: EmptyOr<Length.Type>;
        theta: EmptyOr<Angle.Type>;
    };

    export type Props = {
        value: Value;
        onChange: (v: Partial<Value>) => void;
        disabled?: boolean;
    };

    export const DEFAULT: Value = {
        mode: Enum.Common.positionMode.CARTESIAN.value,
        x: "0px",
        y: "0px",
        radius: "0px",
        theta: "0deg",
    };
}
