/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import * as PontSpec from "pontx-spec";
import { ParametersTable } from "./Parameters";
import { PontJsonSchemaOp } from "../SchemaTable/model/BaseClassSchema";
import { SchemaDynamicTable } from "../SchemaTable/comps/SchemaDynamicTable";
import { Tab } from "@alicloud/console-components";
export class APIProps {
  selectedApi: PontSpec.PontAPI;
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi } = props;

  return (
    <div className="pontx-ui-api">
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
          <Tab defaultActiveKey="doc">
            <Tab.Item key="doc" title="出入参">
              <div className="content">
                <div className="mod">
                  <div className="mod-title">入参</div>
                  <ParametersTable
                    parameters={selectedApi?.parameters}
                    definitions={props.definitions}
                    onStructClick={props.onStructClick}
                  />
                </div>
                <div className="mod">
                  <div className="mod-title">出参</div>

                  <SchemaDynamicTable
                    changeBaseClasss={() => {}}
                    changeResponseBody={() => {}}
                    changeRootApiSchema={() => {}}
                    definitions={props.definitions}
                    onStructClick={props.onStructClick}
                    keyword=""
                    readOnly
                    rows={PontJsonSchemaOp.genrateRows(selectedApi?.responses["200"]?.schema)}
                    tableType="response"
                  ></SchemaDynamicTable>
                </div>
              </div>
            </Tab.Item>
            <Tab.Item key="code_sample" title="示例代码">
              <div className="content">敬请期待...</div>
            </Tab.Item>
            <Tab.Item key="debug" title="调试">
              <div className="content">敬请期待...</div>
            </Tab.Item>
          </Tab>
        </>
      ) : null}
    </div>
  );
};

API.defaultProps = new APIProps();