/**
 * @author jasonHzq
 * @description LeftMenu
 */
import * as React from "react";
import "./LeftMenu.css";
import * as PontSpec from "pont-spec";
import {
  HTMLSelect,
  InputGroup,
  Menu,
  MenuDivider,
  MenuItem,
  Tree,
} from "@blueprintjs/core";
import _ from "lodash";

export class LeftMenuProps {
  specs = [] as PontSpec.PontSpec[];
}

const useCurrentSpec = (specs: PontSpec.PontSpec[]) => {
  const [currSpec, changeCurrSpec] = React.useState(specs[0]);

  React.useEffect(() => {
    if (specs.length) {
      if (specs.length > 1) {
        if (!specs.find((spec) => spec.name === currSpec.name)) {
          changeCurrSpec(specs[0]);
        }
      } else if (!currSpec) {
        changeCurrSpec(specs[0]);
      }
    }
  }, [specs]);

  return {
    currSpec,
    changeCurrSpec,
  };
};

export const LeftMenu: React.FC<LeftMenuProps> = (props) => {
  const { currSpec, changeCurrSpec } = useCurrentSpec(props.specs);
  const [selectedApi, changeSelectedApi] = React.useState("");

  const topArea = (
    <div className='top-area'>
      <div className='title'>pont UI</div>
      {props.specs.length > 1 ? (
        <div className='content'>
          <HTMLSelect
            value={currSpec.name}
            onChange={(e) => {
              changeCurrSpec(
                props.specs.find(
                  (spec) => spec.name === e.target.value
                ) as PontSpec.PontSpec
              );
            }}
            options={props.specs.map((spec) => spec.name)}
          ></HTMLSelect>
        </div>
      ) : null}
    </div>
  );

  const [inputValue, changeInputValue] = React.useState("");
  const [searchValue, _changeSearchValue] = React.useState("");
  const changeSearchValue = React.useCallback((val: any) => {
    return _.debounce(_changeSearchValue)(val);
  }, []);

  // 中英搜索
  const searchArea = (
    <div className='searchArea'>
      <InputGroup
        value={inputValue}
        placeholder='search'
        onChange={(e) => {
          changeInputValue(e.target.value);
          changeSearchValue(e.target.value);
        }}
      />
    </div>
  );

  // 简单、复杂模式切换、搜索、折叠
  const menus = (
    <Menu>
      {(currSpec?.mods || []).map((mod) => {
        return (
          <>
            <MenuDivider title={mod.name} key={`mod-${mod.name}`} />
            {mod.interfaces.map((api) => {
              return (
                <MenuItem
                  key={api.name}
                  onClick={() => changeSelectedApi(api.name)}
                  text={api.name}
                  label={api.description}
                  intent={api.name === selectedApi ? "primary" : "none"}
                />
              );
            })}
          </>
        );
      })}
    </Menu>
  );
  return (
    <div className='pont-ui-left-menu'>
      {topArea}
      {searchArea}
      {menus}
    </div>
  );
};

LeftMenu.defaultProps = new LeftMenuProps();
