import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MainGraph } from "./state/maingraph";
import { GraphView } from "./features/primary";
import { Session } from "./state/session";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <MainGraph.Provider>
            <Session.Provider>
                <GraphView />
            </Session.Provider>
        </MainGraph.Provider>
    </StrictMode>,
);
