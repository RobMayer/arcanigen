type Payloads = {
    svg: {
        type: "svg";
        attributes: { [key: string]: string };
        children?: Payloads["svg"][];
        tag: "g" | "path" | "svg";
    };
};

export type EvaluationPayload<K extends keyof Payloads> = Payloads[K];
