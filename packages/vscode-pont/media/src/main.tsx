import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./registerService";
import "./main.css";
import { App } from "./App";
import { LayoutContext } from "pont-ui";

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <LayoutContext.Provider>
    <App />
  </LayoutContext.Provider>,
  // </React.StrictMode>,
);
