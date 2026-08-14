import { AngleInput } from "../../components/inputs/AngleInput";
import { PointInput } from "../../components/inputs/PointInput";
import { NodeAccordion, SocketIn } from "../../features/nodeview/slots";
import { NodeDefinitions } from "../nodeTypes";
import { DataTypes } from "../dataTypes";
import { Angle } from "../datatypes/angle";
import { PointHelper } from "./pointHelper";
import { Resolver } from "../../util/resolver";
import { ReactNode } from "react";

export namespace TransformPrefab {
    export const SIG_IN = {
        position: "point",
        rotation: "angle",
    } as const;

    /** Spread into a shape's create() payload for the shared position/rotation defaults. */
    export const POSITION_DEFAULT: PointInput.Value = { ...PointInput.DEFAULT };

    export type Definition = {
        inputs: {
            position: DataTypes.Point;
            rotation: DataTypes.Angle;
        };
        outputs: NodeDefinitions.Generic["outputs"];
        payload: {
            position: PointInput.Value;
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
        const positionConnected = node.in.position !== null;

        return (
            <AccordionMaybe has={accordion} socketsIn={"position|rotation"} label={"Transforms"} nodeId={node.id}>
                <SocketIn node={node} socketId={"position"} label={"Position"}>
                    <PointInput value={node.payload.position} onChange={(v) => handleUpdate({ position: { ...node.payload.position, ...v } })} disabled={positionConnected} />
                </SocketIn>
                <SocketIn node={node} socketId={"rotation"} label={"Rotation"}>
                    <AngleInput.SliderInput value={node.payload.rotation} onCommit={(rotation) => handleUpdate({ rotation })} disabled={node.in.rotation !== null} />
                </SocketIn>
            </AccordionMaybe>
        );
    };

    export const evaluate = (node: NodeDefinitions.NodeFor<Definition>, context: Resolver.Context) => {
        const position = context.resolve<DataTypes.Point>(node.id, "position")?.data ?? PointHelper.fromAuthoring(node.payload.position);
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
