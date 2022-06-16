/**
 * @author jasonHzq
 * @description BaseClass
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import "./BaseClass.less";
import { SchemaTable } from "../../components/SchemaTable/comps/SchemaTable";
import { PontJsonSchemaOp } from "../../components/SchemaTable/model/BaseClassSchema";
import classNames from "classnames";

export class BaseClassProps {
  selectedClass: PontSpec.BaseClass;
}

export const BaseClass: React.FC<BaseClassProps> = (props) => {
  const { selectedClass } = props;

  return (
    <div className={classNames("pont-ui-baseclass", (selectedClass as any)?.type)}>
      <div className="header">
        <div className="title">
          数据结构 - {selectedClass?.name}
          {selectedClass?.schema?.templateArgs?.length
            ? `<${selectedClass.schema?.templateArgs.map((arg, argIndex) => "T" + argIndex).join(", ")}>`
            : ""}
        </div>
      </div>
      <SchemaTable
        changeBaseClasss={() => {}}
        changeResponseBody={() => {}}
        changeRootApiSchema={() => {}}
        keyword=""
        readOnly
        rows={PontJsonSchemaOp.genrateRows(props.selectedClass?.schema)}
        tableType="struct"
      />
    </div>
  );
};

BaseClass.defaultProps = new BaseClassProps();
