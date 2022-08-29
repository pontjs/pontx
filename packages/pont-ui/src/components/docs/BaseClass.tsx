/**
 * @author jasonHzq
 * @description BaseClass
 */
import * as React from "react";
import * as PontSpec from "pont-spec";
import "./BaseClass.less";
import { PontJsonSchemaOp } from "../SchemaTable/model/BaseClassSchema";
import classNames from "classnames";
import { SchemaDynamicTable } from "../SchemaTable/comps/SchemaDynamicTable";

export class BaseClassProps {
  name: string;
  schema: PontSpec.PontJsonSchema;
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const BaseClass: React.FC<BaseClassProps> = (props) => {
  const { name, schema } = props;

  return (
    <div className={classNames("pont-ui-baseclass", (schema as any)?.type)}>
      <div className="header">
        <div className="title">
          数据结构 - {name}
          {schema?.templateArgs?.length
            ? `<${schema?.templateArgs.map((arg, argIndex) => "T" + argIndex).join(", ")}>`
            : ""}
        </div>
      </div>

      <SchemaDynamicTable
        changeBaseClasss={() => {}}
        changeResponseBody={() => {}}
        definitions={props.definitions}
        onStructClick={props.onStructClick}
        changeRootApiSchema={() => {}}
        keyword=""
        readOnly
        rows={PontJsonSchemaOp.genrateRows(schema)}
        tableType="struct"
      ></SchemaDynamicTable>
    </div>
  );
};

BaseClass.defaultProps = new BaseClassProps();
