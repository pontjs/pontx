/**
 * @author 奇阳
 * @description diff 管理
 */
import { Input, Menu } from "@alicloud/console-components";
import * as _ from "lodash";
import * as React from "react";
import { LayoutContext } from "../../layout/context";
import * as PontSpec from "pont-spec";
import { diffPontSpec } from "pont-spec-diff";

export class DiffManagerProps {}

export const DiffManager: React.FC<DiffManagerProps> = (props) => {
  const { selectedMeta, currSpec, changeCurrSpec, changeSelectedMeta, remoteSpecs } = LayoutContext.useContainer();
  const diffs = diffPontSpec(currSpec, remoteSpecs?.find((spec) => spec.name === currSpec?.name) || remoteSpecs[0]);
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

  const menus = (
    <Menu selectedKeys={[selectedMeta?.name]} mode="inline">
      {(diffs?.mods || []).map((mod) => {
        return (
          <Menu.SubMenu
            key={mod.name}
            label={
              <div className="mod-name">
                <div className="desc" title={mod.description}>
                  {mod.description}
                </div>
                <div className="name" title={mod.name}>
                  {mod.name}
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
  return <div></div>;
};

DiffManager.defaultProps = new DiffManagerProps();
