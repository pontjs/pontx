/**
 * @author jasonHzq
 * @description
 */
import classNames from "classnames";
import * as React from "react";
import * as _ from "lodash";
import * as PontSpec from "pont-spec";
import { SchemaRow } from "./SchemaRow";
import { SchemaTableContext, SchemaTableNode } from "../model/SchemaTableNode";
import { calculatePadding } from "../utils";
import { SchemaDocRow } from "./SchemaDocRow";
import { SchemaDocTableRow } from "./SchemaDocTableRow";

export class SchemaTableRowProps {
  index: number;
  style?: React.CSSProperties;
  isScrolling?: boolean;
  data: SchemaTableContext;
  useTableStyle? = false;
  baseClasses? = [] as PontSpec.BaseClass[];
}

export const SchemaTableRow: React.FC<SchemaTableRowProps> = React.memo(
  (props) => {
    const { index, style, isScrolling, data } = props;
    const { visibleRows, foldedRows, tableType, readOnly } = data;
    const row = visibleRows[index] as SchemaTableNode;
    const paddingLeft = calculatePadding(row.keys.length || 0, row.schema.type === "object", tableType);

    if (isScrolling) {
      const isEvenRow = index % 2 === 0;
      const classes = classNames("flex schema-row", {
        "bg-white bg-opacity-5": isEvenRow,
      });

      return (
        <div className={classes} style={style}>
          <div className="flex-1 flex">
            <div className="flex flex-1 bp3-control-group row-container" style={{ paddingLeft }}>
              {row?.fieldName ? `${row?.fieldName}:   ` : ""}加载中...
            </div>
          </div>
        </div>
      );
    }

    /** 是否为被收缩的节点 */
    const isFolded = foldedRows.find((rowKeys) => {
      return rowKeys.every((key, keyIndex) => key === row.keys[keyIndex]);
    });
    const isEvenRow = index % 2 === 0;

    if (props.useTableStyle) {
      return (
        <SchemaDocTableRow
          style={{
            isEvenRow,
            CSS: style || {},
            isExpanded: !isFolded,
            paddingLeft,
            tableType,
            readOnly,
          }}
          baseClasses={props.baseClasses || []}
          node={row}
          onSchemaRowAction={data.onSchemaRowAction}
          {...row}
        />
      );
    }

    return (
      <SchemaDocRow
        style={{
          isEvenRow,
          CSS: style || {},
          isExpanded: !isFolded,
          paddingLeft,
          tableType,
          readOnly,
        }}
        baseClasses={props.baseClasses || []}
        node={row}
        onSchemaRowAction={data.onSchemaRowAction}
        {...row}
      />
    );
  },
  (prev, next) => {
    if (!_.isEqual(prev.style, next.style)) {
      return false;
    }
    if (prev.data?.readOnly !== next.data?.readOnly) {
      return false;
    }
    const prevRow = prev.data?.visibleRows[prev.index] as SchemaTableNode;
    const nextRow = next.data?.visibleRows[next.index] as SchemaTableNode;

    if (
      prevRow?.isEndInParent !== nextRow?.isEndInParent ||
      prevRow?.orderInParent !== nextRow?.orderInParent ||
      prevRow?.parentType !== nextRow?.parentType
    ) {
      return false;
    }

    if (prevRow?.schema !== nextRow?.schema || prevRow?.fieldName !== nextRow?.fieldName) {
      return false;
    }

    const prevFoldedRows = prev.data.foldedRows;
    const nextFoldedRows = next.data.foldedRows;
    if (prevFoldedRows !== nextFoldedRows) {
      return false;
    }

    return true;
  },
);

SchemaTableRow.defaultProps = new SchemaTableRowProps();
