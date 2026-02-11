import { defineConfig } from "eslint/config";
import globals from "eslint";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooksConfigurable from "eslint-plugin-react-hooks-configurable";

export default defineConfig([
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
    },
    react.configs.flat.recommended,
    react.configs.flat["jsx-runtime"],
    {
        plugins: {
            "react-hooks-configurable": reactHooksConfigurable,
        },
        rules: {
            ...reactHooksConfigurable.configs.recommended.rules,
            "react/display-name": "off",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    vars: "all",
                    args: "none",
                    varsIgnorePattern: "^_",
                    argsIgnorePattern: "^_",
                    caughtErrors: "none",
                    ignoreRestSiblings: true,
                    ignoreUsingDeclarations: false,
                    reportUsedIgnorePattern: false,
                },
            ],
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-explicit-any": [
                "warn",
                {
                    ignoreRestArgs: true,
                },
            ],
            "react/prop-types": "off",
            "@typescript-eslint/switch-exhaustiveness-check": "warn",
            "react-hooks-configurable/exhaustive-deps": [
                "warn",
                {
                    additionalStableHooks: {
                        // "use.+Ref": true,
                        // utilities
                        "^useCombinedRef$": [true, true],
                        "^useStable$": true,
                        "^useStableValue$": false,
                        "^useFastContextMember$": true,
                        "^useFastContectWatcher$": true,
                        "^useFastContextState$": [false, true],
                        "^useController$": [false, true, true],
                        "^useControllerInternal$": [false, true],
                        "^useControllerExternal$": true,
                        // wrappers
                        "^useAccordion$": true,
                        "^useAccordionControls$": [false, true],
                        "^useTabs$": true,
                        "^useTabsControls$": [false, true],
                        // popups
                        "^useFlyoutPopup$": true,
                        "^useFlyoutPopupControls$": [false, true],
                        "^useContextPopup$": true,
                        "^useContextPopupControls$": [false, true],
                        "^useAnchoredPopup$": true,
                        "^useAnchoredPopupControls$": [false, true],
                        "^useModal$": true,
                        "^useModalControls$": [false, true],
                        "^useDialog$": true,
                        "^useDialogControls$": [false, true],

                        // specializations

                        // session
                        // project
                        // system
                    },
                },
            ],
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
]);
