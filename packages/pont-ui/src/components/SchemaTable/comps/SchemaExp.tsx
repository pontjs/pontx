/**
 * @author
 * @description
 */
import * as React from "react";
import { ObjectMap, PontJsonSchema } from "pont-spec";
import { Dropdown, Overlay } from "@alicloud/console-components";
import { BaseClass as BaseClassComp } from "../../docs/BaseClass";
// import { SchemaTableContext } from "./context";

export function getSchemaDom(
  schema: PontJsonSchema,
  definitions: ObjectMap<PontJsonSchema>,
  changeBaseClass,
  onStructClick: any,
  isExp = true,
) {
  if (!schema) {
    return "any";
  }

  if (typeof schema?.templateIndex === "number" && schema?.templateIndex !== -1) {
    return `T${schema.templateIndex}`;
  }

  let refDom = null as any;

  if (schema.typeName) {
    const base = definitions?.[schema.typeName];

    if (base) {
      refDom = (
        <Overlay.Popup
          wrapperClassName="pont-ui-dropdown-baseclass"
          triggerType={["hover"]}
          trigger={
            <a href="javascript:;" onClick={() => changeBaseClass(base)}>
              {base.typeName}
            </a>
          }
        >
          <div>
            <BaseClassComp
              definitions={definitions}
              onStructClick={onStructClick}
              schema={base}
              name={schema.typeName}
            />
          </div>
        </Overlay.Popup>
      );
    } else {
      refDom = schema.typeName;
    }
  }

  if (schema.templateArgs?.length) {
    return (
      <span>
        {refDom}
        {"<"}
        {schema.templateArgs.map((arg, argIndex) => {
          if (schema.properties || schema.items || schema.additionalProperties) {
            return "T" + argIndex;
          }
          const dom = getSchemaDom(arg, definitions, changeBaseClass, onStructClick);

          return (
            <>
              {dom}
              {argIndex !== (schema.templateArgs?.length as number) - 1 ? ", " : ""}
            </>
          );
        })}
        {">"}
      </span>
    );
  } else if (!schema.type) {
    return refDom;
  }

  if (schema.enum?.length) {
    return schema.enum.map((el) => (typeof el === "string" ? `'${el}'` : el)).join(" | ");
  }

  switch (schema?.typeName) {
    case "long":
    case "integer": {
      return "number";
    }
    case "file": {
      return "File";
    }
    case "Array":
    case "array": {
      if (!isExp) {
        return "array";
      }
      if (schema.items) {
        const dom = getSchemaDom(schema.items as PontJsonSchema, definitions, changeBaseClass, onStructClick);
        return (
          <>
            Array{"<"}
            {dom}
            {">"}
          </>
        );
      }

      return "[]";
    }
    case "object": {
      if (!isExp) {
        return "object";
      }
      if (schema?.properties) {
        return `{ ${Object.keys(schema.properties)
          .map((propName) => {
            return `${propName}: ${PontJsonSchema.toString(schema.properties?.[propName] as PontJsonSchema)}`;
          })
          .join("; ")} }`;
      }
      if (schema?.additionalProperties) {
        const dom = getSchemaDom(
          schema?.additionalProperties as PontJsonSchema,
          definitions,
          changeBaseClass,
          onStructClick,
        );
        return (
          <>
            map{"<"}string{", "}
            {dom}
            {">"}
          </>
        );
      }
    }
  }

  return schema?.type || schema?.typeName || "any";
}

export class SchemaExpProps {
  schema: PontJsonSchema;
  isExp? = true;
  definitions: ObjectMap<PontJsonSchema>;
  onStructClick(struct: { type: string; name: string; spec: any }) {}
}

export const SchemaExp: React.FC<SchemaExpProps> = (props) => {
  // const { definitions } = SchemaTableContext.useContainer();

  const dom = getSchemaDom(
    props.schema,
    props.definitions || {},
    (base) => {
      props.onStructClick({
        type: "baseClass",
        name: base.typeName,
        spec: base,
      });
    },
    props.onStructClick,
    props.isExp,
  );

  return <>{dom}</>;
};

SchemaExp.defaultProps = new SchemaExpProps();
