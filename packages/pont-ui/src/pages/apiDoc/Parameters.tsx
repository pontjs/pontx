/**
 * @author
 * @description
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";
import { DiffResult } from "pont-spec-diff";
import * as _ from "lodash";
import "./Parameters.less";
import { SchemaExp } from "./SchemaExp";
import { LayoutContext } from "../../layout/context";
import { ParameterSchema } from "../../components/SchemaTable/model/ParameterSchema";
import { SchemaDynamicTable } from "../../components/SchemaTable/comps/SchemaDynamicTable";

export class ParametersTableProps {
  parameters: PontSpec.Parameter[];
}

export const ParametersTable: React.FC<ParametersTableProps> = (props) => {
  // console.log(ParameterSchema.genrateRows(props.parameters));
  // const columns = [
  //   {
  //     title: "参数名",
  //     dataIndex: "name",
  //     cell: (value, index, record: PontSpec.Parameter) => {
  //       return (
  //         <div className={record.required ? "param-name" + " required" : "param-name"}>
  //           <div className="name">{record.name}</div>
  //           <div className="pos">({record.in})</div>
  //         </div>
  //       );
  //     },
  //   },
  //   {
  //     title: "类型",
  //     dataIndex: "schema",
  //     cell: (value, index, record: PontSpec.Parameter) => {
  //       return (
  //         <div className="param-type">
  //           <SchemaExp schema={record.schema} />
  //           {record?.schema?.format ? `(${record.schema.format})` : ""}
  //         </div>
  //       );
  //     },
  //   },
  //   {
  //     dataIndex: "description",
  //     title: "描述",
  //     cell(value, index, record: PontSpec.Parameter) {
  //       return record.schema?.description || record.schema?.title;
  //     },
  //   },
  // ];
  // let dataSource = props.parameters || [];

  // if (props.diffParameters) {
  //   dataSource = _.unionBy(props.diffParameters, dataSource, "name");

  //   columns.unshift({
  //     title: "变更类型",
  //     dataIndex: "type",
  //     cell: (type) => {
  //       const textMap = {
  //         update: "变更",
  //         create: "新增",
  //         delete: "删除",
  //       };
  //       return <span className={type}>{textMap[type] || "无变化"}</span>;
  //     },
  //   });
  // }

  return (
    <SchemaDynamicTable
      changeBaseClasss={() => {}}
      changeResponseBody={() => {}}
      changeRootApiSchema={() => {}}
      keyword=""
      readOnly
      rows={ParameterSchema.genrateRows(props?.parameters)}
      tableType="parameters"
    ></SchemaDynamicTable>
  );
};

ParametersTable.defaultProps = new ParametersTableProps();
