/**
 * @author
 * @description
 */

import classNames from "classnames";
import * as React from "react";

export class SwitchButtonProps {
  checked = false;
  onClick() {}
  className?: string;
  children: any;
  disabled?: boolean;
}

export const SwitchButton: React.FC<SwitchButtonProps> = (props) => {
  const { checked, onClick, className, ...rest } = props;
  const cx = classNames(className, "semix-switch-button", {
    active: props.checked,
    disabled: props.disabled,
  });

  return (
    <button className={cx} onClick={props.onClick} {...rest}>
      {props.children}
    </button>
  );
};

SwitchButton.defaultProps = new SwitchButtonProps();
