/**
 * @author
 * @description
 */
import * as React from "react";
import { CommonWidgetProps } from "../../type";
import { TextInput } from "flowbite-react";

export class StringListProps extends CommonWidgetProps {
  value: string[];
  placeholder?: string;
  onChange: (value: string[]) => void;
}

export const StringList: React.FC<StringListProps> = (props) => {
  const { schema, ...rest } = props;
  const [currValue, setCurrValue] = React.useState("");
  const propValue = props.value?.join(",") || "";

  React.useEffect(() => {
    if (propValue !== currValue) {
      if (propValue) {
        setCurrValue(propValue);
      } else {
        setCurrValue("");
      }
    }
  }, [props.value?.join(",")]);

  const ref = React.useRef();

  const changeCurrValue = React.useCallback((val: any) => {
    const value = val === "" ? (undefined as any) : val;
    if (value) {
      setCurrValue(value);
    } else {
      setCurrValue(undefined);
    }
  }, []);

  const handleChange = React.useCallback(() => {
    const stringList = (currValue || "")
      .split(",")
      .map((str) => str.trim())
      .filter((item) => item);
    const currString = stringList.join(",");
    if (propValue === currString) {
      return;
    }
    props.onChange(stringList);
  }, [currValue]);

  const placeholder = React.useMemo(() => {
    if (props.placeholder) {
      return props.placeholder;
    }

    return schema?.props?.placeholder || "请输入字符串，以英文逗号隔开。";
  }, [currValue, props.schema?.props?.placeholder, props.placeholder]);

  const formItem = (
    <div className="input-area flex-1">
      <TextInput
        style={{ width: "100%" }}
        placeholder={placeholder}
        value={currValue}
        onBlur={handleChange}
        disabled={schema.disabled}
        onChange={(e) => {
          changeCurrValue(e.target.value);
        }}
        ref={ref}
      ></TextInput>
    </div>
  );

  return <div className="semix-form-widget semix-string-list-item">{formItem}</div>;
};

StringList.defaultProps = new StringListProps();
