/**
 * @author
 * @description
 */
import * as PontSpec from "pont-spec";
import * as React from "react";
import { LayoutContext, PageType } from "../../layout/context";
import { API } from "../../components/docs/API";
import { BaseClass } from "../../components/docs/BaseClass";
//  import { DiffManager } from "./DiffManager";
import { DiffContent } from "../../components/changes/DiffContent";

export class DiffPageProps {
  schemaType: string;
  modName: string;
  name: string;
  onStructClick(struct: any) {}
}

export const DiffPage: React.FC<DiffPageProps> = (props) => {
  const { currSpec, remoteSpec } = LayoutContext.useContainer();

  let doc = null as any;
  if (props.schemaType === "api") {
    const localApi = currSpec?.apis?.[`${props.modName}/${props.name}`];
    const remoteApi = remoteSpec?.apis?.[`${props.modName}/${props.name}`];

    if (!localApi) {
      doc = <API selectedApi={remoteApi} definitions={currSpec?.definitions} onStructClick={props.onStructClick} />;
    } else if (!remoteApi) {
      doc = <API selectedApi={localApi} definitions={currSpec?.definitions} onStructClick={props.onStructClick} />;
    } else {
      doc = (
        <DiffContent
          definitions={currSpec?.definitions}
          onStructClick={props.onStructClick}
          localMeta={localApi}
          remoteMeta={remoteApi}
          type="api"
        />
      );
    }
  } else if (props.schemaType === "struct") {
    const localClazz = currSpec?.definitions?.[props?.name];
    const remoteClazz = remoteSpec?.definitions?.[props?.name];
    const selectedClazz = localClazz || remoteClazz;
    doc = (
      <BaseClass
        definitions={currSpec?.definitions}
        onStructClick={props.onStructClick}
        name={props?.name}
        schema={selectedClazz}
      />
    );

    if (!localClazz) {
      doc = (
        <BaseClass
          definitions={currSpec?.definitions}
          onStructClick={props.onStructClick}
          name={props?.name}
          schema={remoteClazz!}
        />
      );
    } else if (!remoteClazz) {
      doc = (
        <BaseClass
          definitions={currSpec?.definitions}
          onStructClick={props.onStructClick}
          name={props?.name}
          schema={localClazz}
        />
      );
    } else {
      doc = (
        <DiffContent
          definitions={currSpec?.definitions}
          onStructClick={props.onStructClick}
          localMeta={localClazz}
          remoteMeta={remoteClazz}
          type="baseclass"
        />
      );
    }
  }

  return <div className="pont-ui-page">{doc}</div>;
};

DiffPage.defaultProps = new DiffPageProps();
