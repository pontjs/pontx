/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";
import "./API.less";
import classNames from "classnames";
import { DiffResult } from "pont-spec-diff";
import { getDiffs } from "../diffManager/utils";
import { ParametersTable } from "./Parameters";

export class APIProps {
  selectedApi: PontSpec.Interface;
  diffs?: DiffResult<PontSpec.Interface>;
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi, diffs } = props;

  const responseSchema = selectedApi?.responses?.["200"]?.schema;
  const responses = responseSchema?.type;
  const diffTextMap = {
    update: "接口变更详情",
    delete: "远程接口已删除",
    create: "远程新增接口",
  };
  const diffText = diffTextMap[(diffs as any)?.type];

  return (
    <div className={classNames("pont-ui-api", (diffs as any)?.type)}>
      {selectedApi ? (
        <>
          {diffText ? <div className="diff-text">{diffText}</div> : null}
          <div className="header">
            <div className="method">{selectedApi.method?.toUpperCase()}</div>
            <div className="path">{selectedApi.path}</div>
            <div className="desc">{selectedApi.description}</div>
            <div className="title">{selectedApi?.name}</div>
          </div>
          <div className="content">
            <div className="mod">
              <div className="mod-title">入参</div>
              <ParametersTable parameters={selectedApi?.parameters} diffParameters={props.diffs?.parameters as any} />
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
            {Object.keys(diffs?.diffs || {}).length && diffs?.type === "update" ? (
              <div className="mod">
                <div className="mod-title">变更内容</div>
                {getDiffs(diffs)}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
};

API.defaultProps = new APIProps();
