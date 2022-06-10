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

export class SchemaDocTableRowProps {
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

export const SchemaDocTableRow: React.FC<SchemaDocTableRowProps> = (props) => {
  const [schema, changeSchema] = React.useState(props.node.schema);
  const [rootParam, changeRootParam] = React.useState(props.node.rootParameter);
  const { isEvenRow, isExpanded, paddingLeft, tableType, readOnly } = props.style;
  const { fieldName, prefixes, parentType, keys } = props.node;
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

  const classes = classNames("schema-table-row", {
    "bg-white bg-opacity-5": isEvenRow,
  });

  const styles = { paddingLeft: `${paddingLeft}px`, display: "inline-block" };

  return React.useMemo(() => {
    return (
      <tr data-key={keys.join("/")} className={classes} style={props.style.CSS}>
        <td>
          <div style={{ display: "inline-flex", alignItems: "center", paddingRight: 12 }}>
            <div style={styles}>
              {schema.type === "object" || schema.type === "array" ? (
                <div
                  className="relative cursor-pointer rounded hover:bg-darken-3"
                  style={{
                    marginLeft: -23.5,
                    width: 20,
                    height: 20,
                    marginRight: 3,
                    display: "inline-block",
                    verticalAlign: "middle",
                    textAlign: "center",
                  }}
                  onClick={() => {
                    props.onSchemaRowAction(props.node, { type: isExpanded ? "Folded" : "UnFolded" });
                  }}
                >
                  <i className={isExpanded ? "codicon codicon-chevron-down" : "codicon codicon-chevron-right"}></i>
                </div>
              ) : null}
              {parentType !== "array" && !(tableType !== "parameters" && !prefixes?.length) && !props.node?.isParentMap
                ? fieldName
                : null}
            </div>
            {!!fieldName && parentType !== "array" && <span style={{ marginRight: 3 }}>:&nbsp;</span>}
            <TypeSelector schema={schema} baseClasses={baseClasses} disabled onSchemaChange={(newSchema) => {}} />

            {schema.type === "object" && schema.properties ? (
              <span style={{ color: "#8A8B8C", lineHeight: "20px", marginLeft: 3 }}>{`{${
                Object.keys(schema.properties || {}).length
              }}`}</span>
            ) : null}
          </div>
        </td>
        {props.style?.tableType === "parameters" ? (
          <td>{props.node?.keys?.length === 1 ? rootParam?.in : ""}</td>
        ) : null}
        <td>
          {schema.description || schema.title ? (
            <span className="desc">{schema.description || schema.title}</span>
          ) : null}
        </td>
      </tr>
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
    readOnly,
    baseClasses,
  ]);
};

SchemaDocTableRow.defaultProps = new SchemaDocTableRowProps();
