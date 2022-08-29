/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";
import { LayoutContext, PageType } from "../../layout/context";
import { LeftMenu } from "./LeftMenu";
import { BaseClass } from "../../components/docs/BaseClass";
import { API } from "../../components/docs/API";

export class ApiDocProps {}

export const ApiDoc: React.FC<ApiDocProps> = (props) => {
  const { selectedMeta, page, currSpec, changePage, changeSelectedMeta } = LayoutContext.useContainer();
  const apiDoc = (
    <>
      {selectedMeta?.type === "api" ? (
        <API
          selectedApi={selectedMeta?.spec}
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
        />
      ) : null}
      {selectedMeta?.type === "baseClass" ? (
        <BaseClass
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
          name={selectedMeta?.name}
          schema={selectedMeta?.spec}
        />
      ) : null}
    </>
  );

  return (
    <>
      <LeftMenu></LeftMenu>
      <div className="pont-ui-page">{apiDoc}</div>
    </>
  );
};

ApiDoc.defaultProps = new ApiDocProps();
