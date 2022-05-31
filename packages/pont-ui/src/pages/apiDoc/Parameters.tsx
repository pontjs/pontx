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

export class ParametersTableProps {
  parameters: PontSpec.Parameter[];
  diffParameters?: DiffResult<PontSpec.Parameter>[];
}

export const ParametersTable: React.FC<ParametersTableProps> = (props) => {
  const columns = [
    {
      title: "参数名",
      dataIndex: "name",
      cell: (value, index, record: PontSpec.Parameter) => {
        return (
          <div className={record.required ? "param-name" + " required" : "param-name"}>
            <div className="name">{record.name}</div>
            <div className="pos">({record.in})</div>
          </div>
        );
      },
    },
    {
      title: "类型",
      dataIndex: "schema",
      cell: (value, index, record: PontSpec.Parameter) => {
        return (
          <div className="param-type">
            {PontSpec.PontJsonSchema.toString(record.schema)}
            {record?.schema?.format ? `(${record.schema.format})` : ""}
          </div>
        );
      },
    },
    {
      dataIndex: "description",
      title: "描述",
      cell(value, index, record: PontSpec.Parameter) {
        return record.schema?.description || record.schema?.title;
      },
    },
  ];
  let dataSource = props.parameters || [];

  if (props.diffParameters) {
    dataSource = _.unionBy(props.diffParameters, dataSource, "name");

    columns.unshift({
      title: "变更类型",
      dataIndex: "type",
      cell: (type) => {
        const textMap = {
          update: "变更",
          create: "新增",
          delete: "删除",
        };
        return <span className={type}>{textMap[type] || "无变化"}</span>;
      },
    });
  }

  return (
    <Table
      className="pont-ui-parameters-table"
      dataSource={dataSource}
      emptyContent="当前接口无入参"
      columns={columns}
    ></Table>
  );
};

ParametersTable.defaultProps = new ParametersTableProps();
