/**
 * @author
 * @description
 */
import * as React from "react";
import { SwitchButton } from "./SwitchButton";

export class SwitchButtonGroupProps {
  active: string[] = [];
  dataSource: Array<{
    label: React.ReactNode;
    value: string;
    [x: string]: any;
  }> = [];
  onActiveChange(active: string[]) {}
  multiple? = true;
}

export const SwitchButtonGroup: React.FC<SwitchButtonGroupProps> = (props) => {
  return (
    <span className="semix-switch-button-group">
      {props.dataSource.map((item) => {
        const { label, value, ...rest } = item;

        return (
          <SwitchButton
            checked={props.active?.includes(item.value)}
            onClick={() => {
              if (!props.multiple) {
                if (props.active.includes(item.value)) {
                  props.onActiveChange([]);
                } else {
                  props.onActiveChange([item.value]);
                }
                return;
              }
              if (props.active.includes(item.value)) {
                props.onActiveChange(props.active.filter((val) => val !== item.value));
              } else {
                props.onActiveChange([...props.active, item.value]);
              }
            }}
            {...rest}
          >
            {item.label}
          </SwitchButton>
        );
      })}
    </span>
  );
};

SwitchButtonGroup.defaultProps = new SwitchButtonGroupProps();
