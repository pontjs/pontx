/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { LayoutContext, PageType } from "./context";
import "./Page.less";
import { Table } from "@alicloud/console-components";
import { API } from "../pages/API";
import { BaseClass } from "../pages/BaseClass";
import { DiffManager } from "../pages/diffManager/DiffManager";

export class PageProps {}

export const Page: React.FC<PageProps> = (props) => {
  const { selectedMeta, page } = LayoutContext.useContainer();
  const apiDoc = (
    <>
      {(selectedMeta as PontSpec.Interface)?.path ? <API selectedApi={selectedMeta as PontSpec.Interface} /> : null}
      {(selectedMeta as PontSpec.BaseClass)?.schema ? (
        <BaseClass selectedClass={selectedMeta as PontSpec.BaseClass} />
      ) : null}
    </>
  );
  const apiDiff = <DiffManager />;

  return (
    <div className="pont-ui-page">
      {page === PageType.Diff ? apiDiff : null}
      {page === PageType.Doc ? apiDoc : null}
    </div>
  );
};

Page.defaultProps = new PageProps();
