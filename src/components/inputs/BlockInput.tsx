import styled from "styled-components";
import { ReactNode, useState } from "react";
import { AbstractInput } from "../abstract/Inputs";
import { COMMON_STYLES } from "../styles";
import { Flavour } from "../types";
import { Modal as ModalPopup } from "../popups/Modal";
import { ActionButton } from "../buttons/ActionButton";

const Base = styled(AbstractInput.Block)`
    ${COMMON_STYLES.BLOCK}
`;

export function BlockInput({ flavour, ...props }: BlockInput.Props) {
    return <Base {...props} data-flavour={flavour} />;
}

const Column = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1 1 auto;
    min-width: 0;
`;

const EditorBody = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
    min-width: min(70ch, 80vw);
`;

const BigBlock = styled(BlockInput)`
    min-height: 40vh;
    resize: vertical;
`;

const Footer = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
`;

const Editor = ({ value, onCommit, close, flavour, placeholder }: { value: string; onCommit?: (v: string) => void; close: () => void; flavour?: Flavour; placeholder?: string }) => {
    const [draft, setDraft] = useState(value);
    return (
        <EditorBody>
            <BigBlock value={draft} onValue={setDraft} flavour={flavour} placeholder={placeholder} />
            <Footer>
                <ActionButton flavour={"danger"} onClick={close}>
                    Cancel
                </ActionButton>
                <ActionButton
                    flavour={"confirm"}
                    onClick={() => {
                        onCommit?.(draft);
                        close();
                    }}
                >
                    Confirm
                </ActionButton>
            </Footer>
        </EditorBody>
    );
};

const EditorModal = ({
    controls,
    title,
    value,
    onCommit,
    flavour,
    placeholder,
}: {
    controls: ReturnType<typeof ModalPopup.useControls>;
    title?: ReactNode;
    value: string;
    onCommit?: (v: string) => void;
    flavour?: Flavour;
    placeholder?: string;
}) => {
    return (
        <ModalPopup controls={controls} size={"900px fit"} flavour={flavour}>
            <ModalPopup.Title>{title ?? "Edit Text"}</ModalPopup.Title>
            <Editor value={value} onCommit={onCommit} close={controls.close} flavour={flavour} placeholder={placeholder} />
        </ModalPopup>
    );
};

export namespace BlockInput {
    export type Props = AbstractInput.Block.Props & {
        flavour?: Flavour;
    };

    export type ModalProps = Omit<Props, "onValue"> & {
        title?: ReactNode;
        buttonLabel?: ReactNode;
    };

    export function Modal({ title, buttonLabel, value, onCommit, disabled, flavour, placeholder }: ModalProps) {
        const controls = ModalPopup.useControls();
        return (
            <>
                <ActionButton flavour={flavour} onClick={controls.open} disabled={disabled}>
                    {buttonLabel ?? "Edit…"}
                </ActionButton>
                <EditorModal controls={controls} title={title} value={value} onCommit={onCommit} flavour={flavour} placeholder={placeholder} />
            </>
        );
    }

    export function WithModal({ title, buttonLabel, ...props }: ModalProps) {
        const controls = ModalPopup.useControls();
        return (
            <Column>
                <BlockInput {...props} />
                <ActionButton flavour={props.flavour} onClick={controls.open} disabled={props.disabled}>
                    {buttonLabel ?? "Edit…"}
                </ActionButton>
                <EditorModal controls={controls} title={title} value={props.value} onCommit={props.onCommit} flavour={props.flavour} placeholder={props.placeholder} />
            </Column>
        );
    }
}
