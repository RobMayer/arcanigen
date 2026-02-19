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
            filter: saturate(0);
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
        justify-content: start;
        gap: 4px;
        cursor: pointer;
        transition: outline-offset 0.1s ease;
        outline: 1px solid transparent;
        outline-offset: 1px;
        color: oklch(from var(--flavour) 0.9 calc(c * 0.9) h);
        --icon: oklch(from var(--flavour) 0.8 calc(c * 0.9) h);

        &:disabled {
            opacity: 0.4;
            filter: saturate(0);
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

    export const OPTIONBUTTON = `
        text-align: left;
        align-self: stretch;
        justify-content: start;
        padding: 0.125em 0.25em;
        cursor: pointer;
        transition: outline-offset 0.1s ease;
        outline: 1px solid transparent;
        outline-offset: 1px;
        color: oklch(from var(--flavour) 0.9 calc(c * 0.9) h);
        --icon: oklch(from var(--flavour) 0.8 calc(c * 0.9) h);

        &:disabled {
            opacity: 0.4;
            filter: saturate(0);
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
            background: var(--flavour);
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
            opacity: 0.4;
            filter: saturate(0);
            cursor: auto;
        }
        min-width: 0;
        flex: 1 1 auto;
    `;

    export const BLOCK = `
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
            opacity: 0.4;
            filter: saturate(0);
            cursor: auto;
        }
        min-width: 0;
        flex: 1 1 auto;
        resize: none;
    `;

    export const SLIDER = `
        --handleSize: 1lh;
        --trackSize: calc(1lh / 2 + 2px);
    
        flex: 1 0 auto;

        &[data-orientation="vertical"] {
            flex: 0 1 auto;
        }
        &[data-orientation="vertical"] {
            flex: 1 1;
        }

        &[data-state~="invalid"] {
            outline: 1px solid red;
        }

        &[data-type="linear"] > div[data-part="track"] {
            border-radius: 100vw;
        }
        &[data-type="polar"] > div[data-part="track"] {
            border-radius: 100vw;
        }
        &[data-type="cartesian"] > div[data-part="track"] {
            border-radius: calc(0.5lh + 2px);
        }
        & > div[data-part="track"] {
            background: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
            border: 1px solid var(--flavour);
        }
        & > svg[data-part="track"] {
            & > circle[data-part="border"] {
                stroke: var(--flavour);
                stroke-width: calc(var(--trackSize) + 2px);
            }

            & > circle[data-part="main"] {
                stroke: oklch(from var(--flavour) calc(l - 0.2) calc(c * 0.6) h);
                stroke-width: calc(var(--trackSize));
            }
        }

        & > div[data-part="bounds"] {
            & > div[data-part="handle"] {
                cursor: auto;
                outline: 1px solid transparent;
                transition: outline-offset 0.1s ease;
                outline-offset: 0;
                background: var(--flavour);
                border-radius: 100%;
                border: 1px solid oklch(from var(--flavour) calc(l + 0.1) c h);
            }
        }
        &[data-state~="disabled"] {
            opacity: 0.4;
            filter: saturate(0);
            cursor: auto;
        }
        &:not([data-state~="disabled"]) {
            & > div[data-part="bounds"] > div[data-part="handle"] {
                cursor: move;

                &:active,
                &:hover {
                    background: oklch(from var(--flavour) calc(l + 0.1) c h);
                }
            }
            &:focus-visible > div[data-part="bounds"] > div[data-part="handle"] {
                outline-color: #fffa;
                outline-offset: 2px;
            }
            &[data-orientation="horizontal"] > div[data-part="bounds"] > div[data-part="handle"] {
                cursor: ew-resize;
            }
            &[data-orientation="vertical"] > div[data-part="bounds"] > div[data-part="handle"] {
                cursor: ns-resize;
            }
        }
    `;
}
