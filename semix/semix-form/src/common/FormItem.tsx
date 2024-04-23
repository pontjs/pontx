/**
 * @author
 * @description
 */
import * as React from "react";
import { FormInstance, FormStoreContext, useForm } from "../context";
import _ from "lodash";
import { Field } from "./Field";
import { getSchemaBySchemaPath, getSchemaPathByDataPath } from "../utils";
import { TitleProps } from "./Title";
import { WidgetProps } from "./Widget";

export class FormItemProps {
  /**
   * data path, constant, cannot change
   * dataPath 规范
   * apis[*].parameters[*].name.3
   * apis[*].responses[*]["schema"][3]
   */
  dataPath = "";
  fieldName? = "";
  widget? = "";
  children?: any;
  widgetStyle?: React.CSSProperties = {};
  schemaMapper? = (schema: any) => schema;
  valuePipe?: (value: any) => any = _.identity;
  onChangePipe?: (value: any) => any = _.identity;
  renderTitle?: (props: TitleProps) => any;
  direction?: "horizontal" | "vertical" = "horizontal";
  className?: string;
  widgetProps?: any;
  renderWidget?: (widgetProps: WidgetProps & { value: any; onChange: any }) => any;
}

export const FormItem: React.FC<FormItemProps> = (props) => {
  const form = FormStoreContext.useContainer();
  const schemaPath = getSchemaPathByDataPath(form.schema, props.dataPath);
  const currentSchema = getSchemaBySchemaPath(form.schema, schemaPath);
  const finalSchema = props.schemaMapper(currentSchema);

  if (!finalSchema.type && !finalSchema.$ref) {
    // dynamic visible is false
    return null;
  }

  const direction = form?.schema?.layout?.displayType || (props.direction as any);

  return (
    <Field
      dataPath={props.dataPath}
      schema={finalSchema}
      className={props.className}
      schemaPath={schemaPath}
      fieldName={props.fieldName || props.dataPath}
      widget={props.widget}
      widgetProps={props.widgetProps}
      widgetStyle={props.widgetStyle}
      direction={direction}
      renderTitle={props.renderTitle}
      renderWidget={props.renderWidget}
      valuePipe={props.valuePipe}
      onChangePipe={props.onChangePipe}
    >
      {props.children}
    </Field>
  );
};

FormItem.defaultProps = new FormItemProps();
