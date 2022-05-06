/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";
import "./API.less";

export class APIProps {
  selectedApi: PontSpec.Interface;
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi } = props;

  const responseSchema = selectedApi?.responses?.["200"]?.schema;
  const responses = responseSchema?.type;

  return (
    <div className="pont-ui-api">
      {selectedApi ? (
        <>
          <div className="header">
            <div className="method">{selectedApi.method?.toUpperCase()}</div>
            <div className="path">{selectedApi.path}</div>
            <div className="desc">{selectedApi.description}</div>
            <div className="title">{selectedApi?.name}</div>
          </div>
          <div className="content">
            <div className="mod">
              <div className="mod-title">入参</div>
              <Table
                dataSource={selectedApi?.parameters}
                emptyContent="当前接口无入参"
                columns={[
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
                ]}
              ></Table>
            </div>
            <div className="mod">
              <div className="mod-title">出参</div>
              <Table
                dataSource={[selectedApi?.responses["200"]?.schema]}
                emptyContent="当前接口无出参"
                columns={[
                  {
                    title: "参数名",
                    dataIndex: "name",
                    cell: (value, index, record: PontSpec.PontJsonSchema) => {
                      return (
                        <div className={record.required ? "param-name" + " required" : "param-name"}>
                          <div className="name">{record.name}</div>
                        </div>
                      );
                    },
                  },
                  {
                    title: "类型",
                    dataIndex: "schema",
                    cell: (value, index, record: PontSpec.PontJsonSchema) => {
                      return (
                        <div className="param-type">
                          {PontSpec.PontJsonSchema.toString(record)}
                          {record?.format ? `(${record.format})` : ""}
                        </div>
                      );
                    },
                  },
                  {
                    dataIndex: "description",
                    title: "描述",
                    cell(value, index, record: PontSpec.PontJsonSchema) {
                      return record?.description || record?.title;
                    },
                  },
                ]}
              ></Table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

API.defaultProps = new APIProps();
