import * as React from "react";
import { SwitchButton } from "./SwitchButton";

export class LintButtonProps {
  checked? = false;
  onClick() {}
  errorCnt = 0;
  warningCnt = 0;
  warningIcon = null;
  errorIcon = null;
}

export const LintButton: React.FC<LintButtonProps> = (props) => {
  const [checked, setChecked] = React.useState(props.checked);

  return (
    <SwitchButton
      className="semix-lint-button"
      onClick={() => {
        setChecked(!checked);
        props.onClick();
      }}
      checked={checked}
    >
      {props.errorIcon}
      <span className="error-cnt cnt">{props.errorCnt}</span>
      {props.warningIcon}
      <span className="warning-cnt cnt">{props.warningCnt}</span>
    </SwitchButton>
  );
};

LintButton.defaultProps = new LintButtonProps();
