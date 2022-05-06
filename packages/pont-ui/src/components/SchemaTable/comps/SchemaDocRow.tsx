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

export class SchemaDocRowProps {
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

export const SchemaDocRow: React.FC<SchemaDocRowProps> = (props) => {
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

  const classes = classNames("flex schema-row", {
    "bg-white bg-opacity-5": isEvenRow,
  });

  const styles = { paddingLeft: `${paddingLeft}px` };

  return React.useMemo(() => {
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
            {parentType !== "array" && !(tableType !== "parameters" && !prefixes?.length) && !props.node?.isParentMap
              ? fieldName
              : null}
            {!!fieldName && parentType !== "array" && <span style={{ marginRight: 3 }}>:&nbsp;</span>}
            <TypeSelector schema={schema} baseClasses={baseClasses} disabled onSchemaChange={(newSchema) => {}} />

            {schema.type === "object" && schema.properties ? (
              <span style={{ color: "#8A8B8C", lineHeight: "20px", marginLeft: 3 }}>{`{${
                Object.keys(schema.properties || {}).length
              }}`}</span>
            ) : null}
            {props.style?.tableType === "parameters" && props.node?.keys?.length === 1 ? rootParam?.in : null}

            {schema.description || schema.title ? (
              <span className="desc">{schema.description || schema.title}</span>
            ) : null}
          </div>
          <div className="row-container"></div>
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
    readOnly,
    baseClasses,
  ]);
};

SchemaDocRow.defaultProps = new SchemaDocRowProps();
