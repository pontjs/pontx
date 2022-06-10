/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";
import { LayoutContext } from "../../layout/context";
import { LeftMenu } from "./LeftMenu";
import { BaseClass } from "./BaseClass";
import { API } from "./API";

export class ApiDocProps {}

export const ApiDoc: React.FC<ApiDocProps> = (props) => {
  const { selectedMeta, page } = LayoutContext.useContainer();
  const apiDoc = (
    <>
      {(selectedMeta as PontSpec.Interface)?.parameters || (selectedMeta as PontSpec.Interface)?.responses ? (
        <API selectedApi={selectedMeta as PontSpec.Interface} />
      ) : null}
      {(selectedMeta as PontSpec.BaseClass)?.schema ? (
        <BaseClass selectedClass={selectedMeta as PontSpec.BaseClass} />
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
