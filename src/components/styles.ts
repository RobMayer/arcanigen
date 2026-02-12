export namespace COMMON_STYLES {
    export const BUTTON = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: outline-offset 0.1s ease;
        outline: 1px solid transparent;
        border: 1px solid var(--flavour);
        color: oklch(from var(--flavour) calc(1 - round(l - var(--contrast))) 0 0);
        background: var(--flavour);
        --icon: oklch(from var(--flavour) 0.8 calc(c * 0.9) h);

        &:disabled {
            opacity: 0.4;
            cursor: auto;
        }

        &:focus-visible,
        &:not(:disabled)[data-state~="active"] {
            outline-color: #fffa;
            outline-offset: -2px;
        }

        [data-state~="chosen"],
        &:not(:disabled):hover {
            --icon: #fff;
            border-color: oklch(from var(--flavour) calc(l + 0.1) c h);
            color: #fff;
            background: oklch(from var(--flavour) calc(l + 0.1) c h);
        }

        &[data-state~="unchecked"] {
            background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
            &[data-state~="chosen"],
            &:not(:disabled)&:hover {
                background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
            }
        }
    `;

    export const LITEBUTTON = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: outline-offset 0.1s ease;
        outline: 1px solid transparent;
        outline-offset: 1px;
        color: oklch(from var(--flavour) 0.9 calc(c * 0.9) h);
        --icon: oklch(from var(--flavour) 0.8 calc(c * 0.9) h);

        &:disabled {
            opacity: 0.4;
            cursor: auto;
        }

        &:focus-visible,
        &:not(:disabled)[data-state~="active"] {
            outline-color: #fffc;
            outline-offset: -1px;
        }

        [data-state~="chosen"],
        &:not(:disabled):hover {
            --icon: #fff;
            color: #fff;
        }

        &[data-state~="unchecked"] {
            --icon: oklch(from var(--flavour) 0.5 calc(c * 0.6) h);
            &[data-state~="chosen"],
            &:not(:disabled)&:hover {
                --icon: oklch(from var(--flavour) 0.65 calc(c * 0.5) h);
            }
        }
    `;

    export const INPUT = `
        background: #111;
        padding: 0.25em 0.4em;
        font-family: monospace;
        border: 1px solid #666;
        outline: 1px solid transparent;
        outline-offset: 0px;
        transition: outline-offset 0.1s ease;
        &:focus-visible {
            outline-color: #fffa;
            outline-offset: -2px;
        }
        &:invalid {
            outline-color: #f00;
            background-color: #200;
        }
        &:invalid:focus-visible {
            outline-color: #f88;
        }
        &:disabled {
            opacity: 0.6;
        }
        min-width: 0;
        flex: 1 1 auto;
    `;
}
