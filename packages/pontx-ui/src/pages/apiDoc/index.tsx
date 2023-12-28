/**
 * @author jasonHzq
 * @description API Page Content
 */
import * as React from "react";
import { LayoutContext, Meta, PageType } from "../../layout/context";
import { BaseClass } from "../../components/docs/BaseClass";
import { API } from "../../components/docs/API";
import { APIDirectory } from "../../common/LeftMenu/APIDirectory";
import "../../common/LeftMenu/APIDirectory.scss";

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
      <APIDirectory
        pontxSpec={currSpec}
        onSelect={(name, type) => {
          let modName = "";
          let apiName = name;
          if (name.includes("/")) {
            [modName, apiName] = name.split("/");
          }
          const apiSpec = currSpec?.apis?.[name];

          changeSelectedMeta({
            name: apiName,
            type: type === "api" ? "api" : "baseClass",
            modName,
            spec: apiSpec,
          } as Meta);
        }}
      />
      <div className="pontx-ui-page">{apiDoc}</div>
    </>
  );
};

ApiDoc.defaultProps = new ApiDocProps();
