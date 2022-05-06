/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import { LeftMenu } from "./layout/LeftMenu";
import "bootstrap/dist/css/bootstrap.css";
import "@alicloud/console-components/dist/xconsole.css";
import { Nav } from "./layout/Nav";
import { Page } from "./layout/Page";
import { LayoutContext } from "./layout/context";
import "./App.less";

export class AppProps {}

export const App: React.FC<AppProps> = (props) => {
  return (
    <LayoutContext.Provider>
      <div className="pont-ui">
        <Nav />
        <div className="main-content">
          <LeftMenu></LeftMenu>
          <Page></Page>
        </div>
      </div>
    </LayoutContext.Provider>
  );
};

App.defaultProps = new AppProps();
