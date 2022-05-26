/**
 * @author jasonHzq
 * @description
 */
import { Button, Icon, Message, Select } from "@alicloud/console-components";
import { PontSpec } from "pont-spec";
import * as React from "react";
import { LayoutContext } from "./context";
import "./Nav.less";

export class NavProps {}

export const Nav: React.FC<NavProps> = (props) => {
  const { currSpec, changeCurrSpec, specs, fetchPontSpecs } = LayoutContext.useContainer();

  return (
    <div className="pont-ui-nav">
      <div className="title">pont UI</div>

      {specs.length > 1 ? (
        <Select
          value={currSpec.name}
          onChange={(value) => {
            changeCurrSpec(specs.find((spec) => spec.name === value) as PontSpec);
          }}
          dataSource={specs.map((spec) => spec.name)}
        ></Select>
      ) : null}

      <Button
        onClick={() => {
          fetchPontSpecs().then(() => {
            Message.success("远程数据已同步");
          });
        }}
      >
        <Icon type="refresh" />
        同步
      </Button>
    </div>
  );
};

Nav.defaultProps = new NavProps();
