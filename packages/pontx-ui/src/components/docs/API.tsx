/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import * as PontSpec from "pontx-spec";
import { Tab } from "@alicloud/console-components";
import MarkdownPreview from "@uiw/react-markdown-preview";
import { ApiParamsDoc } from "./ApiParamsDoc";
import { SemixSchemaTable } from "semix-schema-table";
import { getRefSchema } from "./utils";
export class APIProps {
  selectedApi: PontSpec.PontAPI;
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi, definitions } = props;

  const getSchema = React.useCallback(
    ($ref) => {
      return getRefSchema(definitions)($ref);
    },
    [definitions],
  );

  return (
    <div className="pontx-ui-api">
      {selectedApi ? (
        <>
          <div className={"header " + (selectedApi?.deprecated ? "deprecated" : "")}>
            <div className="heading">
              <div className="left">
                {selectedApi.method ? <div className="method">{selectedApi.method?.toUpperCase()}</div> : null}
                <div className="path">{selectedApi.path}</div>
                {selectedApi?.title ? <div className="desc"> - {selectedApi.title}</div> : null}
              </div>
              <div className="title">{selectedApi?.name}</div>
            </div>
            {selectedApi?.summary ? (
              <div className="footer">
                <div className="summary-mod" style={{ width: "100%" }}>
                  {selectedApi?.summary}
                </div>
              </div>
            ) : null}
          </div>
          <div className="api-page-content">
            {selectedApi?.description ? (
              <div className="desc-mod" style={{ width: "100%", margin: "12px 0" }}>
                <MarkdownPreview linkTarget="_blank" sourcePos source={selectedApi?.description} />
              </div>
            ) : null}
            <Tab defaultActiveKey="doc">
              <Tab.Item key="doc" title="API 文档">
                <div className="content">
                  <div className="mod">
                    <div className="mod-title">入参</div>
                    <ApiParamsDoc
                      parameters={selectedApi?.parameters}
                      apiName={selectedApi?.name}
                      schemas={definitions as any}
                    />
                  </div>
                  <div className="mod">
                    <div className="mod-title">出参</div>
                    <SemixSchemaTable
                      name=""
                      schema={selectedApi?.responses["200"]?.schema as any}
                      schemas={definitions as any}
                      getRefSchema={getSchema}
                      renderEmpty={() => {
                        return (
                          <tr>
                            <td colSpan={2} style={{ padding: "15px 0", textAlign: "center" }}>
                              无出参定义
                            </td>
                          </tr>
                        );
                      }}
                    />
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
          </div>
        </>
      ) : null}
    </div>
  );
};

API.defaultProps = new APIProps();
