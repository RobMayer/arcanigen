import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MainGraph } from "./state/maingraph";
import { GraphView } from "./features/primary";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MainGraph.Provider>
            <GraphView />
        </MainGraph.Provider>
    </StrictMode>,
);
