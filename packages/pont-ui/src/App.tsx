/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import { LeftMenu } from "./layout/LeftMenu";

export class AppProps {}

export const App: React.FC<AppProps> = (props) => {
  return (
    <div className='pont-ui'>
      <LeftMenu specs={[]}></LeftMenu>
      hello world
    </div>
  );
};

App.defaultProps = new AppProps();
