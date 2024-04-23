import { CommonWidgetProps } from "../../type";
import * as React from "react";
import { TextInput } from "flowbite-react";

export class NumberInputProps extends CommonWidgetProps {}

export const NumberInput: React.FC<NumberInputProps> = (props) => {
  const { schema, ...rest } = props;
  const [curvalue, setCurvalue] = React.useState(undefined);

  const textMap = {
    double: "浮点数值",
    float: "浮点数值",
    int32: "整型数字",
    int64: "整型数字",
  } as any;

  // const numberProps = {} as any;
  // if (schema.maximum) {
  //   numberProps.max = schema.maximum;
  // }
  // if (schema.minimum) {
  //   numberProps.min = schema.minimum;
  // }

  const emitvalues = React.useCallback(() => {
    if (props.value === curvalue) {
      return;
    }
    props.onChange(curvalue);
  }, [curvalue]);

  const changeCurValue = (value) => {
    if (value || value === 0) {
      setCurvalue(Number(value));
    } else {
      props.onChange(undefined);
      setCurvalue(undefined);
    }
  };

  React.useEffect(() => {
    setCurvalue(props.value);
  }, [props.value]);

  const uischema = {
    ...props.schema,
    type: props.schema?.format?.includes("int") ? "integer" : props?.schema?.type,
  };

  return (
    <TextInput
      value={curvalue}
      onBlur={emitvalues}
      onChange={(e) => {
        changeCurValue(e.target.value);
      }}
      type="number"
      className="semix-form-widget"
      placeholder={schema?.props?.placeholder || schema.format ? `请输入${textMap[schema.format!]}` : "请输入数字"}
    ></TextInput>
  );
};

NumberInput.defaultProps = new NumberInputProps();
