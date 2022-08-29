/**
 * @author
 * @description
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import * as _ from "lodash";
import "./Parameters.less";
import { ParameterSchema } from "../SchemaTable/model/ParameterSchema";
import { SchemaDynamicTable } from "../SchemaTable/comps/SchemaDynamicTable";

export class ParametersTableProps {
  parameters: PontSpec.Parameter[];
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const ParametersTable: React.FC<ParametersTableProps> = (props) => {
  return (
    <SchemaDynamicTable
      changeBaseClasss={() => {}}
      changeResponseBody={() => {}}
      changeRootApiSchema={() => {}}
      keyword=""
      onStructClick={props.onStructClick}
      definitions={props.definitions}
      readOnly
      rows={ParameterSchema.genrateRows(props?.parameters)}
      tableType="parameters"
    ></SchemaDynamicTable>
  );
};

ParametersTable.defaultProps = new ParametersTableProps();
