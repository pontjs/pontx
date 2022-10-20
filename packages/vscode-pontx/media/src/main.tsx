import * as React from "react";
import * as ReactDOM from "react-dom";
import "./registerService";
import "./main.css";
import "pontx-ui/dist/static/main.css";
import { App } from "./components/App";

ReactDOM.hydrate(
  // <React.StrictMode>
  <App />,
  document.getElementById("root")!,
  // </React.StrictMode>,
);
