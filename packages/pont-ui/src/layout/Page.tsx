/**
 * @author
 * @description
 */
import * as React from "react";
import { ApiDoc } from "../pages/apiDoc";
import { DiffPage } from "../pages/diffManager";
import { LayoutContext, PageType } from "./context";

export class PageProps {}

export const Page: React.FC<PageProps> = (props) => {
  const { page } = LayoutContext.useContainer();
  return (
    <div className="main-content">
      {page === PageType.Diff ? <DiffPage></DiffPage> : null}
      {page === PageType.Doc ? <ApiDoc></ApiDoc> : null}
    </div>
  );
};

Page.defaultProps = new PageProps();
