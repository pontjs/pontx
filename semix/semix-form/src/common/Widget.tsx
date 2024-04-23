import * as React from "react";
import { FormStoreContext } from "../context";
import _ from "lodash";
import { SemixUISchema } from "../type";

export class WidgetProps {
  schema: SemixUISchema;
  dataPath: string;
  schemaPath?: string;
  fieldName?: string;
  uploadFile: Function;
  renderTitle?: Function;
  style?: React.CSSProperties = {};
  valuePipe?: (value: any) => any = _.identity;
  onChangePipe?: (value: any) => any = _.identity;
  renderWidget?: (widgetProps: WidgetProps & { value: any; onChange: any }) => any;
}

export const Widget: React.FC<WidgetProps> = (props) => {
  const { schema, renderWidget, ...rest } = props;
  const { formData, widgets, onItemChange } = FormStoreContext.useContainer();
  const widgetType: string = schema.widget || (schema.type as any);
  const WidgetComponent = widgets[widgetType];
  let value = _.get(formData, props.dataPath);

  if (props.valuePipe) {
    value = props.valuePipe(value);
  }

  if (!renderWidget && !WidgetComponent) {
    return (
      <span>
        未知类型
        {schema.widget || schema.type}
      </span>
    );
  }

  return React.useMemo(() => {
    const onChange = (val: any) => {
      if (props.onChangePipe) {
        const newVal = props.onChangePipe(val);
        onItemChange(props.dataPath, newVal);
      } else {
        onItemChange(props.dataPath, val);
      }
    };

    if (renderWidget) {
      return renderWidget({
        ...props,
        value,
        onChange,
      });
    }
    return React.createElement(WidgetComponent, {
      ...props,
      value,
      onChange,
    });
  }, [props.dataPath, value, schema]);
};

Widget.defaultProps = new WidgetProps();
