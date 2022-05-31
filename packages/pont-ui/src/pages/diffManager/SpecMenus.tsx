/**
 * @author
 * @description
 */
import { Menu } from "@alicloud/console-components";
import { BaseClass, Interface, Mod, PontSpec } from "pont-spec";
import { DiffResult } from "pont-spec-diff";
import * as React from "react";

export class SpecMenusProps {
  pontSpec: PontSpec;
  renderModLabel: (mod: DiffResult<Mod>) => any;
  renderApiLabel: (mod: DiffResult<Mod>, api: DiffResult<Interface>) => any;
  renderClazzLabel: (clazz: DiffResult<BaseClass>) => any;
  key: string;
  changeSelectedMeta: Function;
}

export const SpecMenus = (props: SpecMenusProps) => {
  const { pontSpec, renderModLabel, renderApiLabel, renderClazzLabel } = props;

  const mods = (pontSpec?.mods || []).map((mod) => {
    const diffMod = mod as any as DiffResult<Mod>;

    return (
      <Menu.SubMenu key={props.key + "/" + mod.name} label={renderModLabel(diffMod)}>
        {mod.interfaces.map((api) => {
          const newApi = { ...api, type: (api as any).type || (mod as any).type };

          return (
            <Menu.Item key={api.name} id={api.name} onClick={() => props.changeSelectedMeta(newApi)}>
              {renderApiLabel(mod as any, newApi as any)}
            </Menu.Item>
          );
        })}
      </Menu.SubMenu>
    );
  });

  const clazzes = pontSpec.baseClasses?.length ? (
    <Menu.SubMenu key={props.key + "/" + "pont-classes"} label="数据结构">
      {pontSpec.baseClasses.map((clazz) => {
        return (
          <Menu.Item key={clazz.name} id={clazz.name} onClick={() => props.changeSelectedMeta(clazz)}>
            {renderClazzLabel(clazz as any)}
          </Menu.Item>
        );
      })}
    </Menu.SubMenu>
  ) : null;

  return [...mods, clazzes].filter((id) => id);
};
