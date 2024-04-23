import * as React from "react";

import { CommonWidgetProps } from "../../type";
import { Label, Radio } from "flowbite-react";

export class RadioGroupProps extends CommonWidgetProps {}

export const RadioGroup: React.FC<RadioGroupProps> = (props) => {
  const { schema, ...rest } = props;

  const [curvalue, setCurvalue] = React.useState(undefined);

  let enumValueTitles = schema?.enum ? [...schema?.enum] : [];
  if (schema?.enumValueTitles) {
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
    if (item.value === "") {
      return;
    }
    return {
      label: item.title || item?.value || item,
      value: item.value ? item.value : item,
      key: item.value ? item.value : item,
    };
  });

  const changeCurValue = React.useCallback((value) => {
    setCurvalue(value);
    if (value !== props.value) {
      props.onChange(value);
    }
  }, []);

  React.useEffect(() => {
    setCurvalue(props.value);
  }, [props.value]);

  return (
    <div className="semix-form-widget radio">
      {options.map((option) => {
        return (
          <div className="inline-flex">
            <Radio
              id={option.value}
              key={option.value}
              value={option.value}
              checked={option.value === curvalue}
              onChange={(e) => {
                if (e.target.checked) {
                  changeCurValue(option.value);
                }
              }}
            ></Radio>
            <Label htmlFor={option.value}>{option.label}</Label>
          </div>
        );
      })}
    </div>
  );
};

RadioGroup.defaultProps = new RadioGroupProps();
