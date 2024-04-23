/**
 * @author
 * @description
 */
import * as React from "react";
import { SwitchButtonGroup } from "./SwitchButtonGroup";

export class LintSwitcherProps {
  errorCnt = 0;
  warningCnt = 0;
  activeLevels = [] as Array<"warning" | "error">;
  onActiveLevelsChange(active: Array<"warning" | "error">) {}
  errorIcon = null;
  warningIcon = null;
}

export const LintSwitcher: React.FC<LintSwitcherProps> = (props) => {
  const { activeLevels, errorCnt, onActiveLevelsChange, warningCnt } = props;
  return (
    <span className="semix-lint-switcher">
      <SwitchButtonGroup
        dataSource={[
          {
            label: (
              <>
                {props.errorIcon}
                <span className="error-cnt cnt">{errorCnt}</span>
              </>
            ),
            value: "error",
          },
          {
            label: (
              <>
                {props.warningIcon}
                <span className="warning-cnt cnt">{warningCnt}</span>
              </>
            ),
            value: "warning",
          },
        ]}
        active={activeLevels}
        onActiveChange={onActiveLevelsChange}
      />
    </span>
  );
};

LintSwitcher.defaultProps = new LintSwitcherProps();
