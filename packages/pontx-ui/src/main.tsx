import * as React from "react";
import * as ReactDOM from "react-dom";
import "./components/components.less";
import "./components/components.scss";
import { App } from "./App";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root"),
);
