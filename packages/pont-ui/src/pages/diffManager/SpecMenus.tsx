/**
 * @author
 * @description
 */
import { Menu } from "@alicloud/console-components";
import { ObjectMap, Interface, Mod, PontSpec, PontJsonSchema } from "pont-spec";
import { DiffResult } from "pont-spec-diff";
import * as React from "react";
import * as _ from "lodash";

export class SpecMenusProps {
  pontSpec: PontSpec;
  renderModLabel: (mod: DiffResult<Mod>) => any;
  renderApiLabel: (mod: DiffResult<Mod>, api: DiffResult<Interface>) => any;
  renderClazzLabel: (clazz: DiffResult<PontJsonSchema>, name: string) => any;
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
            <Menu.Item
              key={api.name}
              id={api.name}
              onClick={() =>
                props.changeSelectedMeta({
                  type: "api",
                  name: api.name,
                  modName: mod.name,
                  spec: api,
                })
              }
            >
              {renderApiLabel(mod as any, newApi as any)}
            </Menu.Item>
          );
        })}
      </Menu.SubMenu>
    );
  });

  const clazzes = Object.keys(pontSpec.definitions || {}).length ? (
    <Menu.SubMenu
      key={props.key + "/" + "pont-classes"}
      label={
        <span className="diff-item">
          <span className="update">数据结构({Object.keys(pontSpec.definitions || {}).length})</span>
        </span>
      }
    >
      {_.map(pontSpec.definitions || {}, (schema, name) => {
        return (
          <Menu.Item
            key={name}
            id={name}
            onClick={() =>
              props.changeSelectedMeta({
                type: "baseClass",
                name: name,
                spec: schema,
              })
            }
          >
            {renderClazzLabel(schema as any, name)}
          </Menu.Item>
        );
      })}
    </Menu.SubMenu>
  ) : null;

  return [...mods, clazzes].filter((id) => id);
};
