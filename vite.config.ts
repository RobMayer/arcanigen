import { defineConfig } from "vite";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
    define: {
        APP_VERSION: JSON.stringify(pkg.version),
        BUILD_DATE: JSON.stringify(new Date().toISOString().split("T")[0]),
    },
    build: {
        chunkSizeWarningLimit: 2000,
        rolldownOptions: {
            output: {
                advancedChunks: {
                    groups: [{ name: "vendor", test: /node_modules/ }],
                },
            },
        },
    },
});
