import { DetailedHTMLProps, ButtonHTMLAttributes } from "react";

export function AbstractButton({ tooltip, state, ...rest }: AbstractButton.Props) {
    return <button {...rest} type={"button"} title={tooltip} data-state={state} />;
}

export namespace AbstractButton {
    export type Props = Omit<DetailedHTMLProps<ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>, "title"> & { tooltip?: string; state?: string };
}
