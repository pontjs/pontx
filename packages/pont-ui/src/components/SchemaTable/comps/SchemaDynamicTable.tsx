/**
 * @author jasonHzq
 * @description SchemaEditor
 */
import * as React from "react";
import { FixedSizeList, VariableSizeList, areEqual } from "react-window";
import "./SchemaTable.less";
import * as _ from "lodash";
import { SchemaTableRow } from "./SchemaTableRow";
import { SchemaTableContext, SchemaTableNode } from "../model/SchemaTableNode";
import * as PontSpec from "pont-spec";
import { Table } from "@alicloud/console-components";

export class SchemaDynamicTableProps {
  tableType: "parameters" | "response" | "struct";
  readOnly = false;
  keyword = "";
  rows = [] as SchemaTableNode[];
  changeRootApiSchema: (schemaChanger: Function) => any;
  changeResponseBody: (bodyChanger: (newBody: PontSpec.PontJsonSchema) => PontSpec.PontJsonSchema) => any;
  changeBaseClasss: Function;
}

const MAX_HEIGHT = 400;

export const SchemaDynamicTable: React.FC<SchemaDynamicTableProps> = React.memo((props) => {
  const [foldedRows, changeFoldedRows] = React.useState([] as string[][]);

  const visibleRows = props.rows
    .filter((row) => {
      return !foldedRows.some((foldedRowKeys) => {
        // new-param-1
        return (
          row.keys?.length > foldedRowKeys?.length &&
          row.keys.slice(0, foldedRowKeys.length).every((val, keyIndex) => val === foldedRowKeys[keyIndex])
        );
      });
    })
    .filter((row) => {
      if (!props.keyword) {
        return true;
      }
      return row.fieldName?.toLowerCase()?.includes(props.keyword?.toLowerCase());
    });
  const visibleRowsRef = React.useRef<typeof visibleRows>();
  visibleRowsRef.current = visibleRows;
  const editorRef = React.useRef<HTMLDivElement>();
  const scrollToRowKeys = (rowKeys: string[]) => {};
  const handleSchemaRowAction = (row, action) => {
    SchemaTableNode.handleSchemaRowAction(action, row, {
      tableType: props.tableType,
      changeFoldedRows,
      foldedRows,
      scrollToRowKeys,
      changeResponseBody: props.changeResponseBody,
      changeRootApiSchema: props.changeRootApiSchema,
    });
  };
  const itemData = React.useMemo(() => {
    return {
      tableType: props.tableType,
      foldedRows,
      visibleRows,
      readOnly: props.readOnly,
      changeFoldedRows,
      onSchemaRowAction: handleSchemaRowAction,
    } as SchemaTableContext;
  }, [foldedRows, props.rows, props.readOnly, props.keyword]);

  return (
    <div className="pont-ui-schema-editor" ref={editorRef as any}>
      <table>
        <thead>
          <th>名称</th>
          <th>位置</th>
          <th>描述</th>
        </thead>
        <tbody>
          {visibleRows?.map((row, index) => (
            <SchemaTableRow useTableStyle data={itemData} {...row} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

SchemaDynamicTable.defaultProps = new SchemaDynamicTableProps();
