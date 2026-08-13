import styled from "styled-components";
import { Icon, ICONS } from "../../components/Icon";
import { LoopButton } from "../../components/buttons/LoopButton";
import { LengthInput } from "../../components/inputs/LengthInput";
import { AngleInput } from "../../components/inputs/AngleInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { NodeDefinitions } from "../nodeTypes";
import { DataTypes } from "../dataTypes";
import { Enum } from "../datatypes/enum";
import { Angle } from "../datatypes/angle";
import { PointHelper } from "./pointHelper";
import { Resolver } from "../../util/resolver";
import { ReactNode } from "react";

const MODE_OPTIONS = [
    { value: `${Enum.Common.positionMode.CARTESIAN.value}`, label: <Icon shape={ICONS.Coordinates.Cartesian} /> },
    { value: `${Enum.Common.positionMode.POLAR.value}`, label: <Icon shape={ICONS.Coordinates.Polar} /> },
];

const PointRow = styled.div`
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

export namespace TransformPrefab {
    export const SIG_IN = {
        position: "point",
        rotation: "angle",
    } as const;

    export type Definition = {
        inputs: {
            position: DataTypes.Point;
            rotation: DataTypes.Angle;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            positionMode: DataTypes.TypeOf<DataTypes.Enum>;
            positionX: DataTypes.TypeOf<DataTypes.Length>;
            positionY: DataTypes.TypeOf<DataTypes.Length>;
            positionRadius: DataTypes.TypeOf<DataTypes.Length>;
            positionTheta: DataTypes.TypeOf<DataTypes.Angle>;
            rotation: DataTypes.TypeOf<DataTypes.Angle>;
        };
    };

    export const Controls = ({
        node,
        handleUpdate,
        accordion = false,
    }: {
        handleUpdate: (v: Partial<Definition["payload"]>) => void;
        node: NodeDefinitions.NodeFor<Definition>;
        accordion?: boolean;
    }) => {
        const isPolar = node.payload.positionMode === Enum.Common.positionMode.POLAR.value;
        const positionConnected = node.in.position !== null;

        return (
            <AccordionMaybe has={accordion} socketsIn={"position|rotation"} label={"Transforms"} nodeId={node.id}>
                <SocketIn node={node} socketId={"rotation"} label={"Rotation"}>
                    <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"position"} label={"Position"}>
                    <PointRow>
                        <LoopButton.Lite value={`${node.payload.positionMode}`} options={MODE_OPTIONS} onValue={(v) => handleUpdate({ positionMode: Number(v) })} disabled={positionConnected} />
                        {isPolar ? (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.positionRadius} onCommit={(positionRadius) => handleUpdate({ positionRadius })} disabled={positionConnected} required />
                                <AngleInput className={"pointField"} value={node.payload.positionTheta} onCommit={(positionTheta) => handleUpdate({ positionTheta })} disabled={positionConnected} />
                            </>
                        ) : (
                            <>
                                <LengthInput className={"pointField"} value={node.payload.positionX} onCommit={(positionX) => handleUpdate({ positionX })} disabled={positionConnected} required />
                                <LengthInput className={"pointField"} value={node.payload.positionY} onCommit={(positionY) => handleUpdate({ positionY })} disabled={positionConnected} required />
                            </>
                        )}
                    </PointRow>
                </SocketIn>
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
        const position =
            context.resolve<DataTypes.Point>(node.id, "position")?.data ??
            PointHelper.resolve(node.payload.positionMode, node.payload.positionX, node.payload.positionY, node.payload.positionRadius, node.payload.positionTheta);
        const rotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;

        const translateX = position.x;
        const translateY = position.y;

        const css: string[] = [];
        const transforms = { translateX, translateY, rotation };
        if (translateX !== 0 || translateY !== 0) {
            css.push(`translate(${translateX}, ${translateY})`);
        }
        if (rotation !== 0) {
            css.push(`rotate(${rotation})`);
        }

        return [css, transforms] as const;
    };
}

const AccordionMaybe = ({ has, label, children, socketsOut, socketsIn, nodeId }: { children?: ReactNode; has: boolean; socketsIn?: string; socketsOut?: string; nodeId: string; label: string }) => {
    return has ? (
        <NodeAccordion label={label} socketsIn={socketsIn} socketsOut={socketsOut} nodeId={nodeId}>
            {children}
        </NodeAccordion>
    ) : (
        <>{children}</>
    );
};
