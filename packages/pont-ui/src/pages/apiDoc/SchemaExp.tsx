/**
 * @author
 * @description
 */
import * as React from "react";
import { BaseClass, PontJsonSchema } from "pont-spec";
import { Dropdown, Overlay } from "@alicloud/console-components";
import { BaseClass as BaseClassComp } from "./BaseClass";
import { LayoutContext, PageType } from "../../layout/context";

export function getSchemaDom(schema: PontJsonSchema, baseClasses: BaseClass[], changeBaseClass, isExp = true) {
  if (!schema) {
    return "any";
  }

  if (typeof schema?.templateIndex === "number" && schema?.templateIndex !== -1) {
    return `T${schema.templateIndex}`;
  }

  let refDom = null as any;

  if (schema.typeName) {
    const base = baseClasses?.find((clazz) => clazz.name === schema.typeName);
    if (base) {
      refDom = (
        <Overlay.Popup
          wrapperClassName="pont-ui-dropdown-baseclass"
          triggerType={["hover"]}
          trigger={
            <a href="javascript:;" onClick={() => changeBaseClass(base)}>
              {base.name}
            </a>
          }
        >
          <div>
            <BaseClassComp selectedClass={base} />
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
          if (!isExp) {
            return "T" + argIndex;
          }
          const dom = getSchemaDom(arg, baseClasses, changeBaseClass);

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
        const dom = getSchemaDom(schema.items as PontJsonSchema, baseClasses, changeBaseClass);
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
        const dom = getSchemaDom(schema?.additionalProperties as PontJsonSchema, baseClasses, changeBaseClass);
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
}

export const SchemaExp: React.FC<SchemaExpProps> = (props) => {
  const { currSpec, changePage, changeSelectedMeta } = LayoutContext.useContainer();

  const dom = getSchemaDom(
    props.schema,
    currSpec?.baseClasses || [],
    (base) => {
      changeSelectedMeta({
        type: "baseClass",
        name: base.name,
        spec: base,
      });
      changePage(PageType.Doc);
    },
    props.isExp,
  );

  return <>{dom}</>;
};

SchemaExp.defaultProps = new SchemaExpProps();
