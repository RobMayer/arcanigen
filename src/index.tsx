import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Project } from "./state/project";
import { GraphView } from "./features/primary";
import { Session } from "./state/session";

window.onfocus = () => {
    document.dispatchEvent(new CustomEvent("trh:pagefocus"));
};

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Project.Provider>
            <Session.Provider>
                <GraphView graphId={"root"} />
            </Session.Provider>
        </Project.Provider>
    </StrictMode>,
);
