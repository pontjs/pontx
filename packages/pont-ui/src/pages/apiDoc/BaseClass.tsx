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
import { DiffResult } from "pont-spec-diff";

export class BaseClassProps {
  selectedClass: PontSpec.BaseClass;
  diffs?: DiffResult<PontSpec.BaseClass>;
}

export const BaseClass: React.FC<BaseClassProps> = (props) => {
  const { selectedClass, diffs } = props;
  const diffTextMap = {
    update: "数据结构变更详情",
    delete: "远程数据结构已删除",
    create: "远程新增数据结构",
  };
  const diffText = diffTextMap[(diffs as any)?.type];

  return (
    <div className={classNames("pont-ui-baseclass", (selectedClass as any)?.type)}>
      {diffText ? <div className="diff-text">{diffText}</div> : null}
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
