/**
 * @author Field
 * @description
 */
import * as React from "react";
import { FormStoreContext } from "../context";
import { ErrorMessage } from "./ErrorMessage";
import { Title, TitleProps } from "./Title";
import { SemixUISchema } from "../type";
import { Widget, WidgetProps } from "./Widget";
import _ from "lodash";
import classNames from "classnames";
import { checkIsPathEqaul, getSchemaByRef, stringToPaths } from "../utils";

export class FieldProps {
  schema: SemixUISchema;
  dataPath: string;
  schemaPath?: string;
  fieldName? = "";
  isRequired?: boolean;
  titleOperator? = null as any;
  /** 数据结构 */
  components?: {
    [x: string]: SemixUISchema;
  };
  widget? = "";
  widgetStyle?: React.CSSProperties = {};
  children?: any;
  renderTitle?: (props: TitleProps) => any;
  direction?: "horizontal" | "vertical" = "horizontal";
  valuePipe?: (value: any) => any = _.identity;
  onChangePipe?: (value: any) => any = _.identity;
  className?: string;
  widgetProps?: any;
  renderWidget?: (widgetProps: WidgetProps & { value: any; onChange: any }) => any;
}

export const Field: React.FC<FieldProps> = (props) => {
  let schema = props.schema;

  const [collapsed, setCollapsed] = React.useState(false);
  const store = FormStoreContext.useContainer();

  if (props.schema?.$ref) {
    schema = getSchemaByRef(props.schema, props.schema?.$ref);
  }
  if (props.widget) {
    schema = { ...schema, widget: props.widget };
  }

  const errorFields = React.useMemo(() => {
    if (store.isValidating) {
      return store.errorFields?.filter((errField) => {
        return checkIsPathEqaul(errField.dataPath, props.dataPath);
      });
    }
    return [];
  }, [props.dataPath, store.isValidating, store.errorFields]);

  return React.useMemo(() => {
    if (_.isEmpty(schema)) {
      return null;
    }
    const titleProps = {
      schema: schema,
      isRequired: props.isRequired || schema?.isRequired || false,
      fieldName: props.fieldName || "",
      collapsed: collapsed,
      setCollapsed: setCollapsed,
      titleOperator: props.titleOperator,
      dataPath: props.dataPath,
    };
    const schemaPathCx = stringToPaths(props.schemaPath).join("-");
    const renderTitle = props.renderTitle || store.renderTitle;

    return (
      <div className={classNames("semix-form-field", props.direction, schemaPathCx, props.className)}>
        {schema?.hidden === true ? null : (
          <>
            {renderTitle ? (
              store?.widgets?.isTreeWidgets ? (
                props.dataPath && schema.type !== "object" && schema.type !== "array" ? (
                  renderTitle(titleProps)
                ) : null
              ) : (
                renderTitle(titleProps)
              )
            ) : (
              <Title {...titleProps} />
            )}
            {collapsed ? null : (
              <div className="semix-form-widget-wrapper">
                <Widget
                  {...(props.widgetProps || {})}
                  fieldName={props.fieldName}
                  renderWidget={props.renderWidget}
                  schema={schema}
                  dataPath={props.dataPath}
                  schemaPath={props.schemaPath}
                  uploadFile={store.uploadFile}
                  style={props.widgetStyle}
                  valuePipe={props.valuePipe}
                  onChangePipe={props.onChangePipe}
                  renderTitle={store.renderTitle ? store.renderTitle(titleProps) : null}
                />
                <ErrorMessage schema={schema} dataPath={props.dataPath} errorFields={errorFields} />
                {props.children}
              </div>
            )}
          </>
        )}
      </div>
    );
  }, [
    schema,
    props.dataPath,
    props.fieldName,
    props.isRequired,
    collapsed,
    JSON.stringify(errorFields),
    store.renderTitle,
  ]);
};

Field.defaultProps = new FieldProps();
