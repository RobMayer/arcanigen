import { RadioButton } from "../../components/buttons/RadioButton";
import { LengthInput } from "../../components/inputs/LengthInput";
import { AngleInput } from "../../components/inputs/AngleInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { NodeDefinitions } from "../nodeTypes";
import { DataTypes } from "../dataTypes";
import { Enum } from "../datatypes/enum";
import { Length } from "../datatypes/length";
import { Angle } from "../datatypes/angle";
import { NumericString } from "../datatypes/numericString";
import { Resolver } from "../../util/resolver";
import { ReactNode } from "react";

const POSITION_MODE_OPTIONS = Enum.options(Enum.Common.positionMode);

export namespace TransformPrefab {
    export const SIG_IN = {
        positionMode: "enum",
        positionX: "length",
        positionY: "length",
        positionRadius: "length",
        positionTheta: "angle",
        rotation: "angle",
    } as const;

    export type Definition = {
        inputs: {
            positionMode: DataTypes.Enum;
            positionX: DataTypes.Length;
            positionY: DataTypes.Length;
            positionRadius: DataTypes.Length;
            positionTheta: DataTypes.Angle;
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
        const isCartesian = node.payload.positionMode === Enum.Common.positionMode.CARTESIAN.value;
        const isPolar = node.payload.positionMode === Enum.Common.positionMode.POLAR.value;

        return (
            <AccordionMaybe has={accordion} socketsIn={"positionMode|positionX|positionY|positionRadius|positionTheta|rotation"} label={"Transforms"} nodeId={node.id}>
                <SocketIn node={node} socketId={"rotation"} label={"Rotation"}>
                    <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
                </SocketIn>
                <SocketIn node={node} socketId={"positionMode"} label={"Position Mode"}>
                    <RadioButton.Group
                        orientation={"horizontal"}
                        value={`${node.payload.positionMode}`}
                        onValue={(v) => handleUpdate({ positionMode: Number(v) })}
                        disabled={node.in.positionMode !== null}
                        options={POSITION_MODE_OPTIONS}
                    />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"positionX"} label={"Position X"}>
                    <LengthInput value={node.payload.positionX} onCommit={(positionX) => handleUpdate({ positionX })} disabled={node.in.positionX !== null || isPolar} required />
                </SocketIn>
                <SocketIn node={node} socketId={"positionY"} label={"Position Y"}>
                    <LengthInput value={node.payload.positionY} onCommit={(positionY) => handleUpdate({ positionY })} disabled={node.in.positionY !== null || isPolar} required />
                </SocketIn>
                <hr />
                <SocketIn node={node} socketId={"positionRadius"} label={"Position Radius"}>
                    <LengthInput
                        value={node.payload.positionRadius}
                        onCommit={(positionRadius) => handleUpdate({ positionRadius })}
                        disabled={node.in.positionRadius !== null || isCartesian}
                        required
                    />
                </SocketIn>
                <SocketIn node={node} socketId={"positionTheta"} label={"Position Theta"}>
                    <AngleInput.SliderInput value={node.payload.positionTheta} onCommit={(positionTheta) => handleUpdate({ positionTheta })} disabled={node.in.positionTheta !== null || isCartesian} />
                </SocketIn>
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
        const positionMode = Enum.resolve(context.resolve<DataTypes.Enum>(node.id, "positionMode")?.data, Enum.Common.positionMode) ?? node.payload.positionMode;
        const positionX = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "positionX")?.data ?? node.payload.positionX) ?? 0;
        const positionY = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "positionY")?.data ?? node.payload.positionY) ?? 0;
        const positionRadius = Length.Emptyable.asNumber(context.resolve<DataTypes.Length>(node.id, "positionRadius")?.data ?? node.payload.positionRadius) ?? 0;
        const positionTheta = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "positionTheta")?.data ?? node.payload.positionTheta) ?? 0;
        const rotation = Angle.Emptyable.asNumber(context.resolve<DataTypes.Angle>(node.id, "rotation")?.data ?? node.payload.rotation) ?? 0;

        let translateX: number;
        let translateY: number;
        if (positionMode === Enum.Common.positionMode.POLAR.value) {
            const thetaRad = ((positionTheta - 90) * Math.PI) / 180;
            translateX = positionRadius * Math.cos(thetaRad);
            translateY = positionRadius * Math.sin(thetaRad);
        } else {
            translateX = positionX;
            translateY = positionY;
        }

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
