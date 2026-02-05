import { useMemo } from "react";
import { Project } from "../../state/project";
import { Resolver } from "../../util/resolver";

export const SvgCanvas = () => {
    const resolverState = Project.useResolverState();

    const output = useMemo(() => {
        return Resolver.evaluateRootResult(resolverState);
    }, [resolverState]);

    return <></>;
};
