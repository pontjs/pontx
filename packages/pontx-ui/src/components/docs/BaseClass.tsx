/**
 * @author jasonHzq
 * @description BaseClass
 */
import * as React from "react";
import * as PontSpec from "pontx-spec";
import classNames from "classnames";
import { SemixSchemaTable } from "semix-schema-table";
import { getRefSchema } from "./utils";

export class BaseClassProps {
  name: string;
  schema: PontSpec.PontJsonSchema;
  definitions = {} as PontSpec.ObjectMap<PontSpec.PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const BaseClass: React.FC<BaseClassProps> = (props) => {
  const { name, schema } = props;

  return (
    <div className={classNames("pontx-ui-baseclass", (schema as any)?.type)}>
      <div className="header">
        <div className="title">
          数据结构 - {name}
          {schema?.templateArgs?.length
            ? `<${schema?.templateArgs.map((arg, argIndex) => "T" + argIndex).join(", ")}>`
            : ""}
        </div>
      </div>
      <div className="baseclass-page-content">
        <div className="mod">
          <SemixSchemaTable
            name={name}
            schema={schema as any}
            schemas={props.definitions as any}
            getRefSchema={getRefSchema(props.definitions)}
          />
        </div>
      </div>
    </div>
  );
};

BaseClass.defaultProps = new BaseClassProps();
