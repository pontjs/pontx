import * as React from "react";
import * as ReactDOM from "react-dom/client";
import "./registerService";
import "./main.css";
import "pontx-ui/dist/static/main.css";
import { App } from "./components/App";

ReactDOM.hydrateRoot(
  document.getElementById("root")!,
  // <React.StrictMode>
  <App />,
  // </React.StrictMode>,
);
