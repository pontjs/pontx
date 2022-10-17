/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import { Nav } from "./layout/Nav";
import { LayoutContext, PageType } from "./layout/context";
import "./components/styles.less";
import { Page } from "./layout/Page";

export class AppProps {}

export const App: React.FC<AppProps> = (props) => {
  return (
    <LayoutContext.Provider>
      <div className="pontx-ui">
        <Nav />
        <Page />
      </div>
    </LayoutContext.Provider>
  );
};

App.defaultProps = new AppProps();
