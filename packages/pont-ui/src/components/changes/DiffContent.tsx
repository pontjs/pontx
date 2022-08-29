/**
 * @author
 * @description
 */
import * as React from "react";
import { Tab } from "@alicloud/console-components";
import ReactDiffViewer from "react-diff-viewer";
import { BaseClass } from "../docs/BaseClass";
import { API } from "../docs/API";
import * as PontSpec from "pont-spec";
import { BaseClazzDiffOp, diffApi, diffBaseClass } from "pont-spec-diff";
import { ApiDiffOp, getBaseClassDiffDom } from "./APIDiff";
import "./DiffContent.less";

export class DiffContentProps {
  localMeta: any;
  remoteMeta: any;
  type: "api" | "baseclass";
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const DiffContent: React.FC<DiffContentProps> = (props) => {
  const localCode = JSON.stringify(props.localMeta || {}, null, 2);
  const newCode = JSON.stringify(props.remoteMeta || {}, null, 2);
  let diffs = [] as any[];
  let diffStr = "";
  if (props.type === "api") {
    diffs = diffApi(props.localMeta, props.remoteMeta);
    diffStr = JSON.stringify(diffs, null, 2);
  } else {
    diffs = diffBaseClass(props.localMeta, props.remoteMeta);
    diffStr = JSON.stringify(diffs, null, 2);
  }

  return (
    <div className={"page-diff-content pont-ui-" + props.type}>
      <div className={"header"} style={{ marginBottom: 20 }}>
        <div className="method">{props.localMeta.method?.toUpperCase()}</div>
        <div className="path">{props.localMeta.path}</div>
        <div className="desc">{props.localMeta.title}</div>
        <div className="title">{props.localMeta?.name}</div>
      </div>
      <Tab defaultActiveKey="view">
        <Tab.Item key="view" title="变更分析">
          <div className="">
            <div>
              {(diffs || []).map((diff) => {
                return props.type === "api" ? ApiDiffOp.getAPIDiffItems(diff) : getBaseClassDiffDom(diff);
              })}
            </div>
            {/* <div>
              <div className="title">变更分析代码（自己看）</div>
              <pre>
                <code>{diffStr}</code>
              </pre>
            </div> */}
          </div>
        </Tab.Item>
        <Tab.Item key="code" title="元数据对比">
          <ReactDiffViewer
            oldValue={localCode}
            newValue={newCode}
            disableWordDiff
            splitView={false}
            hideLineNumbers
          ></ReactDiffViewer>
        </Tab.Item>
        <Tab.Item key="detail" title="查看文档(新元数据)">
          {props.remoteMeta?.responses || props?.remoteMeta?.parameters ? (
            <API selectedApi={props.remoteMeta} definitions={props.definitions} onStructClick={props.onStructClick} />
          ) : (
            <BaseClass
              schema={props?.remoteMeta}
              name={props?.remoteMeta?.typeName}
              definitions={props.definitions}
              onStructClick={props.onStructClick}
            />
          )}
        </Tab.Item>
      </Tab>
    </div>
  );
};

DiffContent.defaultProps = new DiffContentProps();
