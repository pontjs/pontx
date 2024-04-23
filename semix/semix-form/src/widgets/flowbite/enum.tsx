import * as React from "react";
import { CommonWidgetProps } from "../../type";
import { Select } from "flowbite-react";
import { curry } from "lodash";

export class EnumSelectProps extends CommonWidgetProps {}

export const EnumSelect: React.FC<EnumSelectProps> = (props) => {
  const { schema, ...rest } = props;

  const [curvalue, setCurvalue] = React.useState(undefined);

  let enumValueTitles = schema?.enum ? [...schema?.enum] : [];
  if (schema?.enumValueTitles && Object.keys(schema?.enumValueTitles)?.length) {
    Object.keys(schema?.enumValueTitles)?.map((key) => {
      if (schema?.enum?.includes(key) && enumValueTitles.indexOf(key) !== -1) {
        enumValueTitles.splice(enumValueTitles.indexOf(key), 1);
      }
      enumValueTitles = [
        ...enumValueTitles,
        {
          value: key,
          title: schema?.enumValueTitles[key],
        },
      ];
    });
  }
  const options = enumValueTitles?.map((item: any) => {
    if (typeof item === "string" || typeof item === "number") {
      return {
        label: item,
        value: item,
        key: item,
      };
    }
    if (item.value === "") {
      return;
    }
    return {
      label: item.title && item.title !== item.value ? item.title : item.value,
      value: item.value ? item.value : item,
      key: item.value ? item.value : item,
    };
  });

  const changeCurValue = React.useCallback((value) => {
    if (value) {
      if (value !== props.value) {
        props.onChange(value);
      }
      setCurvalue(value);
    } else {
      props.onChange(undefined);
      setCurvalue(undefined);
    }
  }, []);

  React.useEffect(() => {
    setCurvalue(props.value);
  }, [props.value]);

  const selectedOption = options?.find((option) => option.value === curvalue);

  return (
    <Select
      value={curvalue}
      onChange={(e) => {
        if (!e.target.value) {
          changeCurValue(undefined);
        } else {
          changeCurValue(e.target.value);
        }
      }}
    >
      <option key="empty" value={""} selected={curvalue === undefined}>
        {props.schema?.placeholder || "请选择"}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} selected={curvalue === option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};

EnumSelect.defaultProps = new EnumSelectProps();
