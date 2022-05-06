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

export class SchemaTableProps {
  tableType: "parameters" | "response" | "struct";
  readOnly = false;
  keyword = "";
  rows = [] as SchemaTableNode[];
  changeRootApiSchema: (schemaChanger: Function) => any;
  changeResponseBody: (bodyChanger: (newBody: PontSpec.PontJsonSchema) => PontSpec.PontJsonSchema) => any;
  changeBaseClasss: Function;
}

const MAX_HEIGHT = 400;

export const SchemaTable: React.FC<SchemaTableProps> = React.memo((props) => {
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
  const editorInnerRef = React.useRef<HTMLDivElement>();
  const listRef = React.useRef<{ scrollToItem: (rowIndex: number, type?) => any }>();
  const maxHeight = visibleRows.length * 30;
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
      <FixedSizeList
        height={Math.min(MAX_HEIGHT, maxHeight)}
        width="100%"
        itemKey={(index) => {
          return visibleRows[index].keys.join("/");
        }}
        innerRef={editorInnerRef}
        ref={listRef}
        itemData={itemData}
        itemCount={visibleRows.length}
        itemSize={30}
      >
        {SchemaTableRow}
      </FixedSizeList>
    </div>
  );
});

SchemaTable.defaultProps = new SchemaTableProps();
