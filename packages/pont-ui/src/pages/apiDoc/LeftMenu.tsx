/**
 * @author jasonHzq
 * @description LeftMenu
 *
 * 菜单组件： https://fusion.design/pc/component/menu?themeid=2
 */
import * as React from "react";
import "./LeftMenu.less";
import * as PontSpec from "pont-spec";
import { Select, Input, Menu, Message, Balloon } from "@alicloud/console-components";
import _ from "lodash";
import { LayoutContext } from "../../layout/context";

export class LeftMenuProps {}

export const LeftMenu: React.FC<LeftMenuProps> = (props) => {
  const { selectedMeta, currSpec, changeCurrSpec, changeSelectedMeta, specs } = LayoutContext.useContainer();

  const [inputValue, changeInputValue] = React.useState("");
  const [searchValue, _changeSearchValue] = React.useState("");
  const changeSearchValue = React.useCallback((val: any) => {
    return _.debounce(_changeSearchValue)(val);
  }, []);

  // 中英搜索
  const searchArea = (
    <div className="search-area">
      <Input
        value={inputValue}
        placeholder="search"
        onChange={(value) => {
          changeInputValue(value);
          changeSearchValue(value);
        }}
      />
    </div>
  );

  // 简单、复杂模式切换、搜索、折叠
  const menus = (
    <Menu selectedKeys={[selectedMeta?.name]} mode="inline">
      {(currSpec?.mods || []).map((mod) => {
        return (
          <Menu.SubMenu
            key={mod.name}
            label={
              <div className="mod-name">
                <div className="name" title={mod.name}>
                  {mod.name}
                </div>
                <div className="desc" title={mod.description}>
                  {mod.description}
                </div>
              </div>
            }
          >
            {mod.interfaces.map((api) => {
              return (
                <Menu.Item
                  className={
                    (selectedMeta as PontSpec.Interface)?.path && api.name === selectedMeta?.name ? "selected" : ""
                  }
                  key={api.name}
                  id={api.name}
                  onClick={() => changeSelectedMeta(api)}
                >
                  <div className="api-name">
                    <div className="name" title={api.name}>
                      {api.name}
                    </div>
                    <div className="desc" title={api.description}>
                      {api.description}
                    </div>
                  </div>
                </Menu.Item>
              );
            })}
          </Menu.SubMenu>
        );
      })}

      {currSpec?.baseClasses?.length ? (
        <Menu.SubMenu key="pont-classes" label="数据结构">
          {(currSpec?.baseClasses || []).map((clazz) => {
            return (
              <Menu.Item
                className={clazz.name === selectedMeta?.name ? "selected" : ""}
                key={clazz.name}
                id={clazz.name}
                onClick={() => changeSelectedMeta(clazz)}
              >
                <div className="api-name">
                  <div className="name" title={clazz.name}>
                    {clazz.name}
                  </div>

                  <div className="desc" title={clazz.schema?.description || clazz?.schema?.title}>
                    {clazz.schema?.description || clazz?.schema?.title}
                  </div>
                </div>
              </Menu.Item>
            );
          })}
        </Menu.SubMenu>
      ) : null}
    </Menu>
  );
  return (
    <div className="pont-ui-left-menu">
      {searchArea}
      {!currSpec?.mods?.length && !currSpec?.baseClasses?.length ? <Message type="notice"></Message> : menus}
    </div>
  );
};

LeftMenu.defaultProps = new LeftMenuProps();
