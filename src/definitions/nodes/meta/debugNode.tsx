import { nanoid } from "nanoid";
import { NodeIcon, NODE_ICONS } from "../../../components/Icon";
import { Resolver } from "../../../util/resolver";
import { ReactNode } from "react";
import styled from "styled-components";

import { TypicalNode } from "../../../features/nodeview/node";
import { SocketIn } from "../../../features/nodeview/slots";
import { AllDeps, NodeDefinitions, NodeTypes } from "../../nodeTypes";
import { DataTypes } from "../../dataTypes";
import { Project } from "../../../state/project";
import { useGraphId } from "../../../state/graphId";
import { signature, $, SignatureBuilder } from "../../helpers/signatureBuilder";
import { SignatureEngine } from "../../helpers/signatureEngine";

// A general inspector: accepts ANY input and dumps the resolved value -- its kind tag + a full JSON view of
// its data (arrays get an item count). Works for every kind, present and future (loopFor buses, arrays,
// shapes, ...), since a node's data is exactly what `save()` serializes. A sink, like shapePreview: no
// outputs, reads the upstream value straight from the cache via `useCachedInput`.
const def = signature({
    in: { input: $.ANY },
    out: {},
});

export type DebugDefinition = SignatureBuilder.DefinitionFrom<
    typeof def,
    {
        label: string;
    }
>;

const create = (_input: Partial<NodeDefinitions.PayloadTypeOf<DebugDefinition>>, id: string = nanoid()): NodeDefinitions.BuiltNodeOf<"debug", DebugDefinition> => {
    return {
        id,
        in: {
            input: null,
        },
        out: {},
        payload: {
            label: "",
        },
        type: "debug",
    };
};

const dump = (data: unknown): string => {
    try {
        return JSON.stringify(data, null, 2) ?? String(data);
    } catch {
        return String(data);
    }
};

const Readout = ({ value }: { value: DataTypes.AnyEval | null }): ReactNode => {
    if (value === null) {
        return (
            <ReadoutBase>
                <div className="row">
                    <span className="key">value</span>
                    <span className="none">« none »</span>
                </div>
            </ReadoutBase>
        );
    }
    const items = Array.isArray(value.data) ? (value.data as unknown[]) : null;
    return (
        <ReadoutBase>
            <div className="row">
                <span className="key">kind</span>
                <span className="kind">{value.kind}</span>
                {items !== null && (
                    <span className="count">
                        {items.length} item{items.length === 1 ? "" : "s"}
                    </span>
                )}
            </div>
            <pre className="body">{dump(value.data)}</pre>
        </ReadoutBase>
    );
};

const Controls = ({ node, methods }: { node: NodeDefinitions.NodeFor<DebugDefinition>; methods: ReturnType<typeof Project.useNode>[1] }): ReactNode => {
    const graphId = useGraphId();
    const resolved = Project.useCachedInput(graphId, node, "input");
    return (
        <TypicalNode node={node} methods={methods}>
            <SocketIn node={node} socketId={"input"}>
                Input
            </SocketIn>
            <Readout value={resolved} />
        </TypicalNode>
    );
};

const dependsOn = (_node: NodeDefinitions.NodeFor<DebugDefinition>, _outSocket: keyof DebugDefinition["outputs"], _deps: AllDeps): (keyof DebugDefinition["inputs"])[] => {
    return [];
};

const contributesTo = (_node: NodeDefinitions.NodeFor<DebugDefinition>, _inSocket: keyof DebugDefinition["inputs"], _deps: AllDeps): (keyof DebugDefinition["outputs"])[] => {
    return [];
};

const evaluate = (_node: NodeDefinitions.NodeFor<DebugDefinition>, _socket: keyof DebugDefinition["outputs"], _context: Resolver.Context): DataTypes.AnyEval | null => {
    return null;
};

const ReadoutBase = styled.div`
    display: flex;
    flex-direction: column;
    gap: 0.25em;
    min-width: 12em;

    & > .row {
        display: flex;
        align-items: baseline;
        gap: 0.4em;
    }
    & > .row > .key {
        color: #888;
        text-transform: uppercase;
        font-size: 0.75em;
        letter-spacing: 0.05em;
    }
    & > .row > .kind {
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    & > .row > .count {
        margin-left: auto;
        color: #888;
        white-space: nowrap;
    }
    & > .row > .none {
        color: #888;
        font-style: italic;
    }
    & > .body {
        margin: 0;
        max-height: 14em;
        overflow: auto;
        background: #1c1c1c;
        border: 1px solid #555;
        padding: 0.3em 0.45em;
        white-space: pre-wrap;
        word-break: break-word;
        font-family: monospace;
        font-size: 0.85em;
    }
`;

export const DebugNodeType: NodeTypes.Type<"debug", DebugDefinition> = {
    type: "debug",
    displayName: "Debug",
    defaultLabel: "Debug",
    iconNode: <NodeIcon shape={NODE_ICONS.zoom} />,
    flavour: "info",
    category: "Meta",
    evaluate,
    Controls,
    dependsOn,
    contributesTo,
    create,
    signature: def.instance,
    ...SignatureEngine.hooks,
};
