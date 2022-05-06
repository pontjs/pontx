/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { LayoutContext } from "./context";
import "./Page.less";
import { Table } from "@alicloud/console-components";
import { API } from "../pages/API";
import { BaseClass } from "../pages/BaseClass";

export class PageProps {}

export const Page: React.FC<PageProps> = (props) => {
  const { selectedMeta } = LayoutContext.useContainer();

  return (
    <div className="pont-ui-page">
      {(selectedMeta as PontSpec.Interface)?.path ? <API selectedApi={selectedMeta as PontSpec.Interface} /> : null}
      {(selectedMeta as PontSpec.BaseClass)?.schema ? (
        <BaseClass selectedClass={selectedMeta as PontSpec.BaseClass} />
      ) : null}
    </div>
  );
};

Page.defaultProps = new PageProps();
