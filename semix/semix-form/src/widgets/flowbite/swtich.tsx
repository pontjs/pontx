import * as React from "react";
import { CommonWidgetProps } from "../../type";
import { ToggleSwitch } from "flowbite-react";

export class BooleanSwitchProps extends CommonWidgetProps {}

export const BooleanSwitch: React.FC<BooleanSwitchProps> = (props) => {
  const { schema, ...rest } = props;

  let switchDefault = props?.schema?.default;

  if (typeof switchDefault === "string") {
    switchDefault = switchDefault === "true";
  }

  return (
    <div className="semix-form-widget switch">
      <ToggleSwitch
        style={{ width: "fit-content" }}
        checked={props?.value}
        label={props.value ? schema?.props?.checkedChildren || "" : schema?.props?.unCheckedChildren || ""}
        onChange={(value) => {
          props.onChange(value);
        }}
      />
    </div>
  );
};

BooleanSwitch.defaultProps = new BooleanSwitchProps();
