// import { RuleEngine, ErrorObject } from "semix-rule-lint";
import classNames from "classnames";
import { FixedSizeList, VariableSizeList, areEqual } from "react-window";

import * as React from "react";
import { SemixLintRow, SemixLintRowData, SemixLintRowProps, Info, RuleError } from "./SemixLintRow";
export { LintButton } from "./LintButton";
export { LintSwitcher } from "./LintSwitcher";
export { useRuleLintState } from "./useRuleLintState";
export { SwitchButtonGroup } from "./SwitchButtonGroup";

const TableContainerContext = React.createContext<{
  top: number;
  setTop: any;
  columns: any[];
  useFixedTable: boolean;
}>({
  top: 35,
  setTop: () => {},
  columns: [],
  useFixedTable: true,
});

const SemixLinterTableContainer = React.forwardRef<HTMLDivElement, React.HTMLProps<HTMLDivElement>>(
  function SemixLinterTableContainer({ children, ...rest }, ref) {
    const { top, columns, useFixedTable } = React.useContext(TableContainerContext);
    const style: React.CSSProperties = useFixedTable ? { top, position: "absolute", width: "100%" } : { width: "100%" };

    return (
      <div {...rest} ref={ref}>
        <table className="semix-content-table" style={style}>
          <colgroup>
            {columns.map((col, index) => (
              <col key={index}></col>
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col) => {
                const style = col?.style || {};

                return (
                  <td style={style} className={col.className}>
                    {col.title}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    );
  },
);

export class SemixLinterTableProps {
  loading = false;
  onAutofix? = (
    config: {
      schemaPath: string;
      dataPath: string;
      fixedData: string;
    },
    errorIndex: number,
  ): any => {};
  onLocatePos?(error: RuleError & Info) {}
  onLocateSpec?(error: RuleError & Info) {}
  errors = [] as Array<RuleError>;
  // meta = {
  //   info: {},

  // } as {

  //   info: { product: string; version: string };
  // };
  className?: string;
  style?: React.CSSProperties;
  loadingNode: any;
  columns;
  useFixedTable? = true;
  renderEmpty?() {
    return null;
  }
}

export const SemixLinterTable: React.FC<SemixLinterTableProps> = (props) => {
  const errors = props.errors;
  const maxHeight = (errors.length + 1) * 35;
  const listRef = React.useRef<FixedSizeList | null>();
  const [top, setTop] = React.useState(0);

  const itemData = React.useMemo(() => {
    return {
      errors: errors,
      columns: props.columns,

      // onAutofix: props.onAutofix,
      // onLocateSpec: props.onLocateSpec,
      // onLocatePos: props.onLocatePos,
    } as SemixLintRowData;
  }, [errors]);
  // const tableDom = null;

  const table = props.useFixedTable ? (
    <FixedSizeList
      height={Math.min(400, maxHeight)}
      width="100%"
      innerElementType={SemixLinterTableContainer}
      innerTagName="table"
      itemKey={(index) => {
        return index;
      }}
      onItemsRendered={(props) => {
        const style =
          listRef.current &&
          // @ts-ignore private method access
          listRef.current._getItemStyle(props.overscanStartIndex);
        setTop((style && style.top) || 0);
      }}
      ref={(el) => (listRef.current = el)}
      itemData={itemData}
      outerTagName="div"
      // useIsScrolling
      itemCount={errors.length + 1}
      itemSize={35}
    >
      {SemixLintRow}
    </FixedSizeList>
  ) : (
    <div style={{ width: "100%" }} className="semix-auto-fix-table">
      <SemixLinterTableContainer>
        {errors.map((error, index) => {
          return <SemixLintRow data={itemData} index={index} />;
        })}
      </SemixLinterTableContainer>
    </div>
  );

  const tableDom = (
    <>
      <table className="semix-linter-table-header semix-linter-content-table"></table>
      <div className="semix-linter-table-body">
        {errors?.length ? table : props.renderEmpty()}
        <div>{props.loading ? props.loadingNode : null}</div>
      </div>
    </>
  );

  return (
    <TableContainerContext.Provider
      value={{
        top,
        useFixedTable: props.useFixedTable,
        setTop,
        columns: props.columns,
      }}
    >
      <div className={classNames("semix-linter-table", props.className)} style={props.style}>
        {tableDom}
      </div>
    </TableContainerContext.Provider>
  );
};

SemixLinterTable.defaultProps = new SemixLinterTableProps();
