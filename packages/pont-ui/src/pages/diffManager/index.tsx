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

export class DiffPageProps {}

export const DiffPage: React.FC<DiffPageProps> = (props) => {
  const { selectedMeta, currSpec, remoteSpec } = LayoutContext.useContainer();

  let doc = null as any;
  if (selectedMeta?.["parameters"] || selectedMeta?.["responses"]) {
    const selectedApi =
      PontSpec.PontSpec.findApi(currSpec, selectedMeta?.name) ||
      PontSpec.PontSpec.findApi(remoteSpec, selectedMeta?.name);
    doc = <API selectedApi={selectedApi as any} diffs={selectedMeta as any} />;
  } else if (selectedMeta?.["schema"]) {
    const selectedClazz =
      PontSpec.PontSpec.findBaseClazz(currSpec, selectedMeta?.name) ||
      PontSpec.PontSpec.findBaseClazz(remoteSpec, selectedMeta?.name);
    doc = <BaseClass selectedClass={selectedClazz as any} diffs={selectedMeta as any} />;
  }

  return (
    <>
      <DiffManager />
      <div className="pont-ui-page">{doc}</div>
    </>
  );
};

DiffPage.defaultProps = new DiffPageProps();
