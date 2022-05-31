/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import "bootstrap/dist/css/bootstrap.css";
import "@vscode/codicons/dist/codicon.css";
import "@alicloud/console-components/dist/wind-without-icon-font.css";
import { Nav } from "./layout/Nav";
import { LayoutContext, PageType } from "./layout/context";
import "./App.less";
import { Page } from "./layout/Page";

export class AppProps {}

export const App: React.FC<AppProps> = (props) => {
  return (
    <LayoutContext.Provider>
      <div className="pont-ui">
        <Nav />
        <Page />
      </div>
    </LayoutContext.Provider>
  );
};

App.defaultProps = new AppProps();
