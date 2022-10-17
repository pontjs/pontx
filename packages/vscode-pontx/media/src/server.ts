import * as ReactDOMServer from "react-dom/server";
import * as React from "react";
import { App } from "./components/App";

export const createServerContent = (routerMeta) => {
  return ReactDOMServer.renderToString(
    React.createElement(App, {
      routerMeta,
    }),
  );
};
