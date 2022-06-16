import { Interface, Parameter, PontJsonSchema } from "pont-spec";
import { BaseClazzDiffOp } from "pont-spec-diff";
import * as React from "react";
import ReactDiffViewer from "react-diff-viewer";
import * as _ from "lodash";

type DiffResult = {
  localValue: any;
  remoteValue: any;
  type: "update" | "create" | "delete" | "equal";
  paths: string[];
};

const schemaDiffDom = (diffResult) => {
  const fieldStr = BaseClazzDiffOp.getFields(diffResult?.fields || []);

  if (diffResult.type === "delete") {
    return <span>删除字段 {fieldStr} </span>;
  } else if (diffResult.type === "create") {
    return <span>新增字段 {fieldStr} </span>;
  }

  const localTypeValue = PontJsonSchema.toString(diffResult?.localValue || {});
  const remoteTypeValue = PontJsonSchema.toString(diffResult?.localValue || {});
  const typeDiff =
    localTypeValue !== remoteTypeValue ? (
      <span className="diff-viewer">
        <ReactDiffViewer
          oldValue={localTypeValue}
          newValue={remoteTypeValue}
          leftTitle={fieldStr ? "字段结构 Diff" : "结构 Diff"}
          disableWordDiff
          splitView={false}
          hideLineNumbers
        ></ReactDiffViewer>
      </span>
    ) : null;
  const schemaDiff = _.isEqual(diffResult.localValue, diffResult.remoteValue) ? null : (
    <span className="diff-viewer">
      <ReactDiffViewer
        oldValue={JSON.stringify(diffResult.localValue, null, 2)}
        newValue={JSON.stringify(diffResult.remoteValue, null, 2)}
        disableWordDiff
        leftTitle={fieldStr ? "字段 Schema Diff" : "Schema Diff"}
        splitView={false}
        hideLineNumbers
      ></ReactDiffViewer>
    </span>
  );

  return (
    <span>
      {fieldStr ? (
        <span className="title">变更字段： {BaseClazzDiffOp.getFields(diffResult?.fields || [])}</span>
      ) : null}
      {typeDiff}
      {schemaDiff}
    </span>
  );
};

export class ApiDiffOp {
  static getParameterDiffItems(diffResult: DiffResult, paramName: string) {
    const { paths, type, localValue, remoteValue } = diffResult;
    const [fieldName, ...rest] = paths;

    switch (fieldName as keyof Parameter) {
      case "in": {
        return `参数位置由 ${localValue} 变更为 ${remoteValue}`;
      }
      case "required": {
        if (remoteValue) {
          return `参数变更为必填`;
        } else {
          return `参数变更为非必填`;
        }
      }
      case "schema": {
        const diffResult = BaseClazzDiffOp.getSchemaDiffItems(
          {
            paths: rest,
            remoteValue,
            localValue,
            type,
          },
          [],
        );

        return schemaDiffDom(diffResult);
      }
    }
  }

  static getAPIDiffItems(diffResult: DiffResult) {
    const { paths, type, localValue, remoteValue } = diffResult;

    const [fieldName, ...rest] = paths;

    switch (fieldName as keyof Interface) {
      case "deprecated": {
        return <li>deprecated 变更为 {remoteValue}</li>;
      }
      case "description":
      case "title":
      case "method":
      case "path": {
        return (
          <li>
            {fieldName} 由 {localValue} 变更为 {remoteValue}
          </li>
        );
      }
      case "parameters": {
        const [paramName, ...others] = rest;

        if (!others?.length) {
          if (type === "create") {
            return <li>新增请求参数 {paramName}</li>;
          } else if (type === "delete") {
            return <li>删除请求参数 {paramName}</li>;
          } else if (type === "update") {
            return (
              <li>
                变更请求参数 {paramName}
                <div className="content">
                  {ApiDiffOp.getParameterDiffItems(
                    {
                      localValue,
                      remoteValue,
                      paths: rest,
                      type,
                    },
                    paramName,
                  )}
                </div>
              </li>
            );
          }
        }
      }
      case "responses": {
        const [statusCode, field, ...others] = rest;

        const diffResult = BaseClazzDiffOp.getSchemaDiffItems(
          {
            localValue,
            remoteValue,
            paths: others,
            type,
          },
          [],
        );

        return (
          <li>
            返回参数变更
            <div className="content">{schemaDiffDom(diffResult)}</div>
          </li>
        );
      }
    }
  }
}

export const getBaseClassDiffDom = (diff: DiffResult) => {
  const diffResult = BaseClazzDiffOp.getSchemaDiffItems(
    {
      ...diff,
      paths: diff?.paths?.slice(1) || [],
    },
    [],
  );

  return <li>{schemaDiffDom(diffResult)}</li>;
};
