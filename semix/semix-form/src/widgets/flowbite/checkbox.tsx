import * as React from "react";
import { CommonWidgetProps } from "../../type";

export class CheckboxGroupProps extends CommonWidgetProps {}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = (props) => {
  const { schema, ...rest } = props;

  const [currValue, setCurrValue] = React.useState(undefined);

  let enumValueTitles = schema?.items?.enum ? [...schema?.items?.enum] : [];
  const itemTitles = schema?.items?.enumValueTitles;
  if (itemTitles) {
    Object.keys(itemTitles)?.map((key) => {
      if (enumValueTitles?.includes(key) && enumValueTitles.indexOf(key) !== -1) {
        enumValueTitles.splice(enumValueTitles.indexOf(key), 1);
      }
      enumValueTitles = [
        ...enumValueTitles,
        {
          value: key,
          title: itemTitles[key],
        },
      ];
    });
  }
  const options = (enumValueTitles || []).map((item: any) => {
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
    setCurrValue(value);
    if (value !== props.value) {
      props.onChange(value);
    }
  }, []);

  React.useEffect(() => {
    setCurrValue(props.value);
  }, [props.value]);

  return (
    <div className="semix-form-widget checkbox">
      {options.map((option) => {
        return (
          <div key={option?.key} className="flex items-center ps-4 border border-gray-200 rounded dark:border-gray-700">
            <input
              id="bordered-checkbox-1"
              type="checkbox"
              value=""
              onChange={(e) => {
                changeCurValue(e.target.checked ? option?.value : undefined);
              }}
              checked={currValue === option?.value}
              name="bordered-checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <label className="w-full py-4 ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">
              Default radio
            </label>
          </div>
        );
      })}
    </div>
  );
};

CheckboxGroup.defaultProps = new CheckboxGroupProps();
