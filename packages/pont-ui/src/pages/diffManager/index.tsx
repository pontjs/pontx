/**
 * @author
 * @description
 */
import * as PontSpec from "pont-spec";
import * as React from "react";
import { LayoutContext } from "../../layout/context";
import { API } from "../apiDoc/API";
import { BaseClass } from "../apiDoc/BaseClass";
import { DiffManager } from "./DiffManager";
import { DiffContent } from "./DiffContent";

export class DiffPageProps {}

export const DiffPage: React.FC<DiffPageProps> = (props) => {
  const { selectedMeta, currSpec, remoteSpec } = LayoutContext.useContainer();

  let doc = null as any;
  if (selectedMeta?.type === "api") {
    const localApi = PontSpec.PontSpec.findApi(currSpec, selectedMeta.modName!, selectedMeta.name);
    const remoteApi = PontSpec.PontSpec.findApi(remoteSpec, selectedMeta.modName!, selectedMeta.name);
    if (!localApi) {
      doc = <API selectedApi={remoteApi} />;
    } else if (!remoteApi) {
      doc = <API selectedApi={localApi} />;
    } else {
      doc = <DiffContent localMeta={localApi} remoteMeta={remoteApi} type="api" />;
    }
  } else if (selectedMeta?.type === "baseClass") {
    const selectedClazz =
      PontSpec.PontSpec.findBaseClazz(currSpec, selectedMeta?.name) ||
      PontSpec.PontSpec.findBaseClazz(remoteSpec, selectedMeta?.name);
    doc = <BaseClass selectedClass={selectedClazz as any} />;

    const localClazz = PontSpec.PontSpec.findBaseClazz(currSpec, selectedMeta?.name);
    const remoteClazz = PontSpec.PontSpec.findBaseClazz(remoteSpec, selectedMeta?.name);

    if (!localClazz) {
      doc = <BaseClass selectedClass={remoteClazz!} />;
    } else if (!remoteClazz) {
      doc = <BaseClass selectedClass={localClazz} />;
    } else {
      doc = <DiffContent localMeta={localClazz} remoteMeta={remoteClazz} type="baseclass" />;
    }
  }

  return (
    <>
      <DiffManager />
      <div className="pont-ui-page">{doc}</div>
    </>
  );
};

DiffPage.defaultProps = new DiffPageProps();
