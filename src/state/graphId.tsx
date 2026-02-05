import { createContext, useContext } from "react";

export const GraphIdContext = createContext<string>("root");
export const useGraphId = () => useContext(GraphIdContext);
