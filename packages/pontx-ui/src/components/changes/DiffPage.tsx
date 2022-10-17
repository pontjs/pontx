/**
 * @author
 * @description
 */
import * as React from "react";
import { API } from "../../components/docs/API";
import { BaseClass } from "../../components/docs/BaseClass";
//  import { DiffManager } from "./DiffManager";
import { DiffContent } from "../../components/changes/DiffContent";

export class DiffPageProps {
  schemaType: string;
  modName: string;
  name: string;
  onStructClick(struct: any) {}
  localSpec: any;
  remoteSpec: any;
  definitions: any;
}

export const DiffPage: React.FC<DiffPageProps> = (props) => {
  let doc = null as any;
  if (props.schemaType === "api") {
    if (!props.localSpec) {
      doc = <API selectedApi={props.remoteSpec} definitions={props?.definitions} onStructClick={props.onStructClick} />;
    } else if (!props.remoteSpec) {
      doc = <API selectedApi={props.localSpec} definitions={props?.definitions} onStructClick={props.onStructClick} />;
    } else {
      doc = (
        <DiffContent
          definitions={props?.definitions}
          onStructClick={props.onStructClick}
          localMeta={props.localSpec}
          remoteMeta={props.remoteSpec}
          type="api"
        />
      );
    }
  } else if (props.schemaType === "struct") {
    const localClazz = props.localSpec;
    const remoteClazz = props.remoteSpec;
    const selectedClazz = localClazz || remoteClazz;
    doc = (
      <BaseClass
        definitions={props?.definitions}
        onStructClick={props.onStructClick}
        name={props?.name}
        schema={selectedClazz}
      />
    );

    if (!localClazz) {
      doc = (
        <BaseClass
          definitions={props?.definitions}
          onStructClick={props.onStructClick}
          name={props?.name}
          schema={remoteClazz!}
        />
      );
    } else if (!remoteClazz) {
      doc = (
        <BaseClass
          definitions={props?.definitions}
          onStructClick={props.onStructClick}
          name={props?.name}
          schema={localClazz}
        />
      );
    } else {
      doc = (
        <DiffContent
          definitions={props?.definitions}
          onStructClick={props.onStructClick}
          localMeta={localClazz}
          remoteMeta={remoteClazz}
          type="baseclass"
        />
      );
    }
  }

  return <div className="pontx-ui-page">{doc}</div>;
};

DiffPage.defaultProps = new DiffPageProps();
