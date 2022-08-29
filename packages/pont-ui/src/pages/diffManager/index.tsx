/**
 * @author
 * @description
 */
import * as PontSpec from "pont-spec";
import * as React from "react";
import { LayoutContext, PageType } from "../../layout/context";
import { API } from "../../components/docs/API";
import { BaseClass } from "../../components/docs/BaseClass";
// import { DiffManager } from "./DiffManager";
import { DiffContent } from "../../components/changes/DiffContent";

export class DiffPageProps {}

export const DiffPage: React.FC<DiffPageProps> = (props) => {
  const { selectedMeta, currSpec, remoteSpec, changePage, changeSelectedMeta } = LayoutContext.useContainer();

  let doc = null as any;
  if (selectedMeta?.type === "api") {
    const localApi = currSpec?.apis?.[`${selectedMeta.modName}/${selectedMeta.name}`];
    const remoteApi = remoteSpec?.apis?.[`${selectedMeta.modName}/${selectedMeta.name}`];

    if (!localApi) {
      doc = (
        <API
          selectedApi={remoteApi}
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
        />
      );
    } else if (!remoteApi) {
      doc = (
        <API
          selectedApi={localApi}
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
        />
      );
    } else {
      doc = (
        <DiffContent
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
          localMeta={localApi}
          remoteMeta={remoteApi}
          type="api"
        />
      );
    }
  } else if (selectedMeta?.type === "baseClass") {
    const localClazz = currSpec?.definitions?.[selectedMeta?.name];
    const remoteClazz = remoteSpec?.definitions?.[selectedMeta?.name];
    const selectedClazz = localClazz || remoteClazz;
    doc = (
      <BaseClass
        definitions={currSpec?.definitions}
        onStructClick={(struct) => {
          changePage(PageType.Doc);
          changeSelectedMeta(struct as any);
        }}
        name={selectedMeta?.name}
        schema={selectedClazz}
      />
    );

    if (!localClazz) {
      doc = (
        <BaseClass
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
          name={selectedMeta?.name}
          schema={remoteClazz!}
        />
      );
    } else if (!remoteClazz) {
      doc = (
        <BaseClass
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
          name={selectedMeta?.name}
          schema={localClazz}
        />
      );
    } else {
      doc = (
        <DiffContent
          definitions={currSpec?.definitions}
          onStructClick={(struct) => {
            changePage(PageType.Doc);
            changeSelectedMeta(struct as any);
          }}
          localMeta={localClazz}
          remoteMeta={remoteClazz}
          type="baseclass"
        />
      );
    }
  }

  return (
    <>
      {/* <DiffManager /> */}
      <div className="pont-ui-page">{doc}</div>
    </>
  );
};

DiffPage.defaultProps = new DiffPageProps();
