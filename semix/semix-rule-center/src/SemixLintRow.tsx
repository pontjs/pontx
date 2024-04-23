/**
 * @author
 * @description
 */
import * as React from "react";
import { ErrorObject } from "semix-validate";

export type Info = { product: string; version: string };
export type RuleError = ErrorObject;

export class SemixLintRowData {
  errors: RuleError[];
  // meta = {} as any;
  columns = [] as any[];
}

export class SemixLintRowProps {
  index: number;
  data: SemixLintRowData;
}

export const SemixLintRow: React.FC<SemixLintRowProps> = (props) => {
  const errorIndex = props.index;
  const { errors, columns } = props.data;
  const error = errors[errorIndex];
  // console.log(apiErrors, error);

  if (!error) {
    return <tr></tr>;
  }

  return React.useMemo(() => {
    return (
      <tr key={errorIndex} className={errorIndex % 2 === 0 ? "even" : "odd"}>
        {columns.map((column) => {
          let className = "";
          if (typeof column.className === "function") {
            className = column.className(error?.[column.dataIndex], errorIndex, error);
          } else if (typeof column.className === "string") {
            className = column.className;
          }
          const style = column?.style || {};
          return (
            <td className={className} style={style}>
              {column.cell?.(error?.[column.dataIndex], errorIndex, error) ||
                error?.[column.dataIndex]}
            </td>
          );
        })}
      </tr>
    );
  }, [error, errorIndex]);
};

SemixLintRow.defaultProps = new SemixLintRowProps();
