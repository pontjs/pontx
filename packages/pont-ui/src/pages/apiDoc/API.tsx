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
import { SchemaExp } from "./SchemaExp";
import { PontJsonSchemaOp } from "../../components/SchemaTable/model/BaseClassSchema";
import { SchemaTable } from "../../components/SchemaTable/comps/SchemaTable";

export class APIProps {
  selectedApi: PontSpec.Interface;
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi } = props;

  return (
    <div className={classNames("pont-ui-api")}>
      {selectedApi ? (
        <>
          <div className={"header " + (selectedApi?.deprecated ? "deprecated" : "")}>
            <div className="method">{selectedApi.method?.toUpperCase()}</div>
            <div className="path">{selectedApi.path}</div>
            <div className="desc">{selectedApi.title}</div>
            <div className="title">{selectedApi?.name}</div>
          </div>
          {selectedApi?.description ? (
            <div className="desc-mod" style={{ margin: "12px 0", width: "100%" }}>
              接口详情：{selectedApi?.description}
            </div>
          ) : null}
          <div className="content">
            <div className="mod">
              <div className="mod-title">入参</div>
              <ParametersTable parameters={selectedApi?.parameters} />
            </div>
            <div className="mod">
              <div className="mod-title">出参</div>

              <SchemaTable
                changeBaseClasss={() => {}}
                changeResponseBody={() => {}}
                changeRootApiSchema={() => {}}
                keyword=""
                readOnly
                rows={PontJsonSchemaOp.genrateRows(selectedApi?.responses["200"]?.schema)}
                tableType="response"
              />
              {/* <Table
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
                          <SchemaExp schema={record} />
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
              ></Table> */}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

API.defaultProps = new APIProps();
