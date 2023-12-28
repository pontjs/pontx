/**
 * @author jasonHzq
 * @description
 */
import * as React from "react";
import * as PontSpec from "pontx-spec";
import Tabs, { TabPane } from "rc-tabs";
import { SemixSchemaTable, SemixMarkdown, RootContext, InnerSchemaTable } from "semix-schema-table";
import { ApiParamsDoc } from "./ApiParamsDoc";
import { getRefSchema, renderExpandIcon } from "./utils";
import TabBar from "rc-tabs/lib/TabBar";
import TabContent from "rc-tabs/lib/TabContent";

export class APIProps {
  selectedApi: PontSpec.PontAPI;
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
  renderMore?() {
    return null;
  }
}

export const API: React.FC<APIProps> = (props) => {
  const { selectedApi, definitions } = props;

  const getSchema = React.useCallback(
    ($ref) => {
      return getRefSchema(definitions)($ref);
    },
    [definitions],
  );

  const initValue = React.useMemo(() => {
    return {
      schemas: definitions as any,
      getRefSchema: getSchema,
      renderTypeColAppendix: (node) => {
        if (node?.nodeValue?.schema.in) {
          return (
            <div
              className="in"
              style={{
                color: "gray",
                fontFamily: "monospace",
                fontSize: 12,
                fontStyle: "italic",
                fontWeight: 600,
              }}
            >
              ({node.nodeValue?.schema.in})
            </div>
          );
        }
        return null;
      },
      renderEmpty: () => {
        return (
          <tr>
            <td colSpan={2} style={{ padding: "15px 0", textAlign: "center" }}>
              无出参定义
            </td>
          </tr>
        );
      },
    };
  }, [definitions, getSchema]);

  const pathEle = selectedApi.path ? <div className="path">{selectedApi.path}</div> : null;
  const apiNameEle = selectedApi?.name ? <div className="title">{selectedApi?.name}</div> : null;

  return (
    <div className="pontx-ui-api">
      <RootContext.Provider initialState={initValue}>
        {selectedApi ? (
          <>
            <div className={"header " + (selectedApi?.deprecated ? "deprecated" : "")}>
              <div className="heading">
                <div className="left">
                  {selectedApi.method ? <div className="method">{selectedApi.method?.toUpperCase()}</div> : null}
                  {selectedApi.deprecated ? (
                    <span className="tag deprecated" style={{ marginRight: 12, color: "#888" }}>
                      deprecated
                    </span>
                  ) : null}
                  {pathEle || apiNameEle}
                  {selectedApi?.title ? <div className="desc"> - {selectedApi.title}</div> : null}
                </div>
                <div className="right">
                  {pathEle ? apiNameEle : null}
                  {selectedApi?.externalDocs?.url ? (
                    <a
                      className="pontx-button"
                      style={{ marginLeft: 12 }}
                      href={selectedApi?.externalDocs?.url}
                      target="_blank"
                    >
                      {selectedApi?.externalDocs?.description || "查看更多"}
                    </a>
                  ) : null}
                </div>
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
              <Tabs
                defaultActiveKey="doc"
                renderTabBar={() => <TabBar />}
                renderTabContent={() => <TabContent animated={false} />}
              >
                <TabPane key="doc" tab="API 文档">
                  <div className="content">
                    {selectedApi?.description ? (
                      <div className="末端desc-mod" style={{ width: "100%", margin: "12px 0" }}>
                        <SemixMarkdown copiable source={selectedApi?.description} />
                      </div>
                    ) : null}
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
                      <InnerSchemaTable
                        name=""
                        renderExpandIcon={renderExpandIcon}
                        schema={selectedApi?.responses["200"]?.schema as any}
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
                    {props.renderMore?.()}
                  </div>
                </TabPane>
                <TabPane key="code_sample" tab="示例代码">
                  <div className="content">敬请期待...</div>
                </TabPane>
                <TabPane key="debug" tab="调试">
                  <div className="content">敬请期待...</div>
                </TabPane>
              </Tabs>
            </div>
          </>
        ) : null}
      </RootContext.Provider>
    </div>
  );
};

API.defaultProps = new APIProps();
