/**
 * @author jasonHzq
 * @description 一行
 */

import * as React from "react";
import classNames from "classnames";
import * as _ from "lodash";
import { SchemaTableContext, SchemaTableNode } from "../model/SchemaTableNode";
import { immutableSet } from "../../../utils/utils";
import { Balloon, Button, Icon, Input, Select } from "@alicloud/console-components";
import { SchemaName } from "./SchemaName";
import { TypeSelector } from "./TypeSelector";
import * as PontSpec from "pont-spec";

export class SchemaRowProps {
  node: SchemaTableNode;
  style: {
    isExpanded: boolean;
    isEvenRow: boolean;
    CSS: React.CSSProperties;
    paddingLeft: number;
    readOnly: boolean;
    tableType: "parameters" | "response" | "struct";
  };
  baseClasses = [] as PontSpec.BaseClass[];

  onSchemaRowAction: SchemaTableContext["onSchemaRowAction"];
}

export const SchemaRow: React.FC<SchemaRowProps> = (props) => {
  const [schema, changeSchema] = React.useState(props.node.schema);
  const [rootParam, changeRootParam] = React.useState(props.node.rootParameter);
  const { isEvenRow, isExpanded, paddingLeft, tableType, readOnly } = props.style;
  const { fieldName, prefixes, parentType, keys } = props.node;
  const [moreStructVisible, changeMoreStructVisible] = React.useState(false);
  const { baseClasses } = props;

  React.useEffect(() => {
    if (props.node?.schema !== schema) {
      changeSchema(props.node?.schema);
    }
  }, [props.node?.schema]);

  React.useEffect(() => {
    if (props.node?.rootParameter !== rootParam) {
      changeRootParam(props.node?.rootParameter);
    }
  }, [props.node?.rootParameter]);

  const classes = classNames("flex schema-row", {
    "bg-white bg-opacity-5": isEvenRow,
  });

  const styles = { paddingLeft: `${paddingLeft}px` };

  const commonOnChange = React.useCallback(
    (appendFields: string[], newValue) => {
      const newSchema = appendFields.length ? immutableSet(appendFields, newValue, schema) : newValue;
      changeSchema(newSchema);

      // note
      props.onSchemaRowAction(props.node, {
        type: "ChangeSchema",
        payload: (originSchema) => {
          return appendFields.length ? immutableSet(appendFields, newValue, originSchema) : newValue;
        },
      });
    },
    [props.node.prefixes.join("/"), schema],
  );

  return React.useMemo(() => {
    const requiredItem = readOnly ? (
      <div className="pont-action-btn disabled" onClick={() => {}}>
        <Icon type="warning" color={schema?.required ? "red" : ""} />
      </div>
    ) : (
      <div
        className="pont-action-btn"
        onClick={() => {
          commonOnChange(["required"], !schema.required);
        }}
      >
        <Icon type="warning" color={schema?.required ? "red" : ""} />
      </div>
    );

    return (
      <div role="schema-row" data-key={keys.join("/")} className={classes} style={props.style.CSS}>
        <div className="flex flex-1 items-center">
          <div className="flex flex-1 bp3-control-group row-container" style={styles}>
            {schema.type === "object" || schema.type === "array" ? (
              <div
                className="relative flex items-center justify-center cursor-pointer rounded hover:bg-darken-3"
                style={{
                  marginLeft: -23.5,
                  width: 20,
                  height: 20,
                  marginRight: 3,
                  textAlign: "center",
                }}
                onClick={() => {
                  props.onSchemaRowAction(props.node, { type: isExpanded ? "Folded" : "UnFolded" });
                }}
              >
                <Icon type={isExpanded ? "button-down" : "button-right"} />
              </div>
            ) : null}
            {parentType !== "array" &&
            !(tableType !== "parameters" && !prefixes?.length) &&
            !props.node?.isParentMap ? (
              <SchemaName
                isDisabled={(rootParam?.in === "body" && parentType === "root") || readOnly}
                onChange={(newFieldName) => {
                  props.onSchemaRowAction(props.node, { type: "ChangeName", payload: newFieldName });
                }}
                value={fieldName || ""}
              />
            ) : null}
            {!!fieldName && parentType !== "array" && <span style={{ marginRight: 3 }}>:&nbsp;</span>}
            <TypeSelector
              schema={schema}
              baseClasses={baseClasses}
              disabled={readOnly}
              onSchemaChange={(newSchema) => {
                changeSchema(newSchema);
                props.onSchemaRowAction(props.node, {
                  type: "ChangeSchema",
                  payload: () => newSchema,
                });
              }}
            />
            {schema.$ref ? (
              <a
                href="javascript:;"
                onClick={() => {
                  const comp = baseClasses?.find(
                    (comp) => comp.name === schema.$ref?.slice("#/components/schemas/"?.length),
                  );
                  if (comp) {
                    // note
                    // openMetaDialog({
                    //   type: "BaseClass",
                    //   name: comp.name,
                    // });
                  }
                }}
                style={{ lineHeight: "20px" }}
              >
                查看
              </a>
            ) : null}

            {schema.type === "object" && schema.properties ? (
              <span className="ml-3" style={{ color: "#8A8B8C", lineHeight: "20px" }}>{`{${
                Object.keys(schema.properties || {}).length
              }}`}</span>
            ) : null}
            {(schema.type === "object" || (schema.type === "array" && !Object.keys(schema.items || {}).length)) &&
              !(schema?.additionalProperties && Object.keys(schema?.additionalProperties)?.length) &&
              !readOnly && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    padding: "0.25rem",
                    marginRight: 2,
                  }}
                  onClick={() => {
                    props.onSchemaRowAction(props.node, { type: "Plus" });
                  }}
                  className="relative flex items-center justify-center cursor-pointer rounded hover:bg-darken-3 z-10 ml-3"
                >
                  <Icon type="plus" />
                </div>
              )}
            <span className="desc">{schema.description || schema.title}</span>
          </div>

          <div className="row-container ">
            {props.style?.tableType === "parameters" && props.node?.keys?.length === 1 ? (
              <Select
                dataSource={["query", "path", "body", "formData", "header"]}
                placeholder="请选择..."
                disabled={readOnly}
                className="pos-select"
                onChange={(e) => {
                  let newValue = e.target.value as any;
                  if (newValue === "请选择...") {
                    newValue = undefined;
                  }
                  changeRootParam({ ...rootParam, in: newValue } as any);
                  props.onSchemaRowAction(props.node, {
                    type: "ChangeParam",
                    payload:
                      newValue === "body"
                        ? {
                            field: "in",
                            value: newValue,
                            name: "body",
                          }
                        : {
                            field: "in",
                            value: newValue,
                          },
                  });
                }}
                value={rootParam?.in}
              ></Select>
            ) : null}
          </div>

          <div className="actions mr-4">
            {props.node.orderInParent === 0 || readOnly ? (
              <div className="pont-action-btn disabled" style={{ opacity: 0.25 }}>
                <Icon color="#A7B6C2" type="arrow-up" />
              </div>
            ) : (
              <div
                className="pont-action-btn small"
                onClick={() => {
                  props.onSchemaRowAction(props.node, { type: "MoveUp" });
                }}
              >
                <Icon color="#A7B6C2" type="arrow-up" />
              </div>
            )}
            {(tableType === "response" && props.node.parentType === "root") || props.node.isEndInParent || readOnly ? (
              <div
                className="pont-action-btn disabled"
                style={{
                  opacity: props.node.parentType === "root" || props.node.isEndInParent || readOnly ? 0.25 : 1,
                }}
              >
                <Icon color="#A7B6C2" type="arrow-down" />
              </div>
            ) : (
              <div
                className="pont-action-btn"
                onClick={() => {
                  props.onSchemaRowAction(props.node, { type: "MoveDown" });
                }}
              >
                <Icon color="#A7B6C2" type="arrow-down" />
              </div>
            )}
            {fieldName && !readOnly ? (
              <div
                className="pont-action-btn"
                onClick={() => {
                  props.onSchemaRowAction(props.node, { type: "Delete" });
                }}
                role={"delete row"}
              >
                <Icon color="#A7B6C2" type="delete" />
              </div>
            ) : (
              <div className="pont-action-btn disabled" style={{ opacity: 0.25 }}>
                <Icon color="#A7B6C2" type="delete" />
              </div>
            )}
            {
              <div
                className={
                  "pont-action-btn" +
                  (parentType === "array" || (tableType === "response" && !prefixes?.length) || !fieldName || readOnly
                    ? " disabled"
                    : "")
                }
                style={
                  parentType === "array" || (tableType === "response" && !prefixes?.length) || !fieldName || readOnly
                    ? { opacity: 0.25 }
                    : {}
                }
                onClick={() => {
                  props.onSchemaRowAction(props.node, { type: "Duplicate" });
                }}
              >
                <Icon color="#A7B6C2" type="copy" />
              </div>
            }
          </div>
          {/* {requiredItem} */}
          {/* <Balloon
            triggerType="hover"
            
            trigger={
              <div className="pont-action-btn">
                <Icon color={schema.description ? "blue" : ""} type="document" />
              </div>
            }
          >
            <Input.TextArea
              className="outline-none border-0"
              aria-label={"描述"}
              style={{ minWidth: 250 }}
              placeholder="请输入字段描述"
              disabled={readOnly}
              defaultValue={schema.description || ""}
              onBlur={(e) => {
                commonOnChange(["description"], e.target.value);
              }}
            />
          </Balloon> */}
        </div>
      </div>
    );
  }, [
    schema,
    rootParam,
    isEvenRow,
    isExpanded,
    paddingLeft,
    tableType,
    fieldName,
    prefixes,
    parentType,
    keys,
    moreStructVisible,
    readOnly,
    baseClasses,
  ]);
};

SchemaRow.defaultProps = new SchemaRowProps();
