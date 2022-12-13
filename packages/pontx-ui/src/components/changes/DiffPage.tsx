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
  const getDiffHeader = (diffType: "delete" | "create", schemaType: "api" | "struct", name: string) => {
    let diffText = "";
    const itemText = {
      api: " API ",
      struct: "数据结构",
    }[schemaType];
    if (diffType === "delete") {
      diffText = `已删除${itemText}：${name}`;
    } else if (diffType === "create") {
      diffText = `已新增${itemText}：${name}`;
    }
    return <div className={`diff-page-header ${diffType}`}>{diffText}</div>;
  };
  if (props.schemaType === "api") {
    if (!props.localSpec) {
      doc = (
        <>
          {getDiffHeader("create", "api", props.remoteSpec.name)}
          <API selectedApi={props.remoteSpec} definitions={props?.definitions} onStructClick={props.onStructClick} />
        </>
      );
    } else if (!props.remoteSpec) {
      doc = (
        <>
          {getDiffHeader("delete", "api", props.localSpec.name)}
          <API selectedApi={props.localSpec} definitions={props?.definitions} onStructClick={props.onStructClick} />
        </>
      );
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
        <>
          {getDiffHeader("create", "struct", props.name)}
          <BaseClass
            definitions={props?.definitions}
            onStructClick={props.onStructClick}
            name={props?.name}
            schema={remoteClazz!}
          />
        </>
      );
    } else if (!remoteClazz) {
      doc = (
        <>
          {getDiffHeader("delete", "struct", props.name)}
          <BaseClass
            definitions={props?.definitions}
            onStructClick={props.onStructClick}
            name={props?.name}
            schema={localClazz}
          />
        </>
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
