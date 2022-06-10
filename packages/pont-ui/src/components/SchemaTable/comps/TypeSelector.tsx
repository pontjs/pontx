/**
 * @author jasonHzq
 * @description 类型选择器
 */

import { Balloon, Button, Message, Select } from "@alicloud/console-components";
import * as PontSpec from "pont-spec";
import * as React from "react";
import { PontJsonSchemaOp } from "../model/BaseClassSchema";
import classNames from "classnames";
import "./TypeSelector.less";
import { SchemaExp } from "../../../pages/apiDoc/SchemaExp";

const typeStyleMap = {
  text: {
    object: "text-blue-6 dark:text-blue-4",
    map: "text-blue-6 dark:text-blue-4",
    any: "text-blue-5",
    array: "text-green-6 dark:text-green-4",
    allOf: "text-orange-5",
    oneOf: "text-orange-5",
    anyOf: "text-orange-5",
    null: "text-orange-5",
    integer: "text-red-7 dark:text-red-6",
    number: "text-red-7 dark:text-red-6",
    boolean: "text-red-4",
    binary: "text-green-4",
    string: "text-green-7 dark:text-green-5",
    $ref: "text-purple-6 dark:text-purple-4",
  },

  bg: {
    object: "bg-blue-6",
    map: "bg-blue-5",
    any: "bg-blue-5",
    array: "bg-green-6",
    allOf: "bg-orange-5",
    oneOf: "bg-orange-5",
    anyOf: "bg-orange-5",
    null: "bg-orange-5",
    integer: "bg-red-7",
    number: "bg-red-7",
    boolean: "bg-red-4",
    binary: "bg-green-4",
    string: "bg-green-7",
    $ref: "bg-purple-6",
  },
};

const constTypes = ["object", "array", "map", "string", "number", "integer", "boolean", "$ref"];

export class TypeSelectorProps {
  schema: PontSpec.PontJsonSchema;
  onSchemaChange(schema: PontSpec.PontJsonSchema) {}
  disabled = false;
  baseClasses = [] as PontSpec.BaseClass[];
}
const getSchemaType = (schema: PontSpec.PontJsonSchema) => {
  if (schema.$ref) {
    return "$ref";
  }
  if (schema?.type === "object" && !schema?.properties) {
    return "map";
  }

  return schema.type as string;
};

export const TypeSelector: React.FC<TypeSelectorProps> = (props) => {
  const [type, changeType] = React.useState(props.schema?.type as string);
  const [isOpen, changeIsOpen] = React.useState(false);
  const [$ref, changeRef] = React.useState(props.schema?.$ref);

  const enableAnyType = true;
  const types = enableAnyType ? [...constTypes, "any"] : constTypes;

  React.useEffect(() => {
    if (getSchemaType(props.schema) !== type) {
      changeType(getSchemaType(props.schema));
    }
    if (props.schema.$ref !== $ref) {
      changeRef(props.schema.$ref);
    }
  }, [props.schema?.format, props.schema?.type, props.schema?.$ref]);

  const saveState = (state: { newType?: string; new$ref?: string } = { newType: type }) => {
    const newType = state.newType || type;
    const new$ref = Object.prototype.hasOwnProperty.call(state, "new$ref") ? state.new$ref : $ref;

    if (newType === "$ref" && !new$ref) {
      Message.error("引用的数据结构必填！");
      return;
    }

    let newSchema = null as any as PontSpec.PontJsonSchema;
    if (new$ref) {
      newSchema = PontJsonSchemaOp.changeType(props.schema, "$ref", new$ref);
    } else {
      newSchema = PontJsonSchemaOp.changeType(props.schema, newType);
    }
    props.onSchemaChange(newSchema);
    changeIsOpen(false);
  };

  const popoverContent = (
    <div className="pont-ui-popover-wrapper">
      <div className="flex flex-col text-smtype-selector-popover pont-ui-type-selector-popover">
        <div style={{ padding: 12 }}>
          <div className="flex flex-wrap">
            <div className="w-full uppercase font-semibold mb-2">类型</div>
          </div>
          <div className="flex flex-wrap">
            {types.map((currentType) => {
              return (
                <div
                  key={currentType}
                  className={classNames("flex items-center justify-center mr-2 px-2 py-1 rounded cursor-pointer", {
                    [typeStyleMap.bg[type]]: type === currentType,
                    ["text-white"]: type === currentType,
                    "hover:bg-darken-3": type !== currentType,
                  })}
                  onClick={() => {
                    if (currentType !== type) {
                      changeType(currentType);
                      changeRef(undefined);
                      if (
                        ["boolean", "any"].includes(currentType) ||
                        ["array", "object"].includes(currentType) ||
                        currentType === "map"
                      ) {
                        saveState({
                          newType: currentType,
                          new$ref: undefined,
                        });
                      }
                    }
                  }}
                >
                  {currentType}
                </div>
              );
            })}
          </div>
          {type === "$ref" ? (
            <div className="flex flex-col mt-5 w-auto flex-no-wrap">
              <div className="font-semibold mb-2 w-full">引用的数据结构</div>
              <div className="flex flex-no-wrap">
                <Select
                  dataSource={props.baseClasses.map((comp) => {
                    return { value: `#/components/schemas/${comp.name}`, label: comp.name };
                  })}
                  popupContainer={(dom) => {
                    return dom;
                  }}
                  notFoundContent="本空间暂无数据结构"
                  className="flex-1 w-full pont-ui-refs-suggest"
                  style={{ width: 410 }}
                  value={$ref}
                  onChange={(ref) => {
                    changeRef(ref);
                    saveState({
                      new$ref: ref,
                    });
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="bp3-divider mt-2 ml-0 mr-0"></div>
        <div className="p-3 footer ">
          <div className="pull-right">
            <Button
              type="primary"
              size="small"
              onClick={() => {
                saveState({});
              }}
            >
              确定
            </Button>
            <Button size="small" style={{ marginLeft: 12 }} onClick={() => changeIsOpen(false)}>
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const typeValue = <SchemaExp schema={props.schema} isExp={false} />;

  // let typeValue = PontSpec.PontJsonSchema.toString(props.schema);

  // if (props.schema?.isDefsType && props.schema.typeName) {
  //   typeValue = (
  //     <a
  //       href="javascript:;"
  //       onClick={() => {
  //         const comp = props.baseClasses?.find((comp) => comp.name === props.schema.typeName);
  //         if (comp) {
  //           // note
  //           // openMetaDialog({
  //           //   type: "BaseClass",
  //           //   name: comp.name,
  //           // });
  //         }
  //       }}
  //       style={{ lineHeight: "20px" }}
  //     >
  //       {props.schema.typeName}
  //     </a>
  //   );
  // }

  if (props.disabled) {
    return (
      <div
        style={{ lineHeight: "20px", marginRight: props.schema.isDefsType ? 5 : 0 }}
        className={classNames(
          "type-selector flex items-center cursor-pointer truncate",
          props.disabled ? "hover:not-allowed" : "hover:underline",
        )}
        onClick={() => {
          if (!props.disabled) {
            changeIsOpen(true);
          }
        }}
      >
        <div
          className={classNames(
            "flex items-center flex-no-wrap truncate",
            typeStyleMap.text[props.schema?.isDefsType ? "$ref" : (props.schema.type as any)],
          )}
        >
          {typeValue}
        </div>
      </div>
    );
  }

  return (
    <Balloon
      delay={0}
      align="rb"
      popupStyle={{ width: 510, maxWidth: 510 }}
      closable={false}
      triggerType="click"
      onClose={() => changeIsOpen(false)}
      onVisibleChange={(vis) => {
        if (!vis && type === "closeClick") {
          changeIsOpen(vis);
        }
      }}
      popupClassName="pont-ui-type-selector-popover-container"
      trigger={
        <div
          style={{ lineHeight: "20px", marginRight: props.schema.$ref ? 5 : 0 }}
          className={classNames(
            "type-selector flex items-center cursor-pointer truncate",
            props.disabled ? "hover:not-allowed" : "hover:underline",
          )}
          onClick={() => {
            if (!props.disabled) {
              changeIsOpen(true);
            }
          }}
        >
          <div
            className={classNames(
              "flex items-center flex-no-wrap truncate",
              typeStyleMap.text[props.schema?.$ref ? "$ref" : (props.schema.type as any)],
            )}
          >
            {typeValue}
          </div>
        </div>
      }
      className="pont-ui-schema-type-selector"
      visible={isOpen}
    >
      {popoverContent}
    </Balloon>
  );
};

TypeSelector.defaultProps = new TypeSelectorProps();
