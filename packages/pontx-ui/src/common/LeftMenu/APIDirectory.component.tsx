/**
 * @author 滕嘉晖
 * @description
 */
import * as React from "react";
import { DirectoryNode } from "./type";
import { renderSubMenuGroup, renderSubMenuItem } from "./SubMenu";
import classNames from "classnames";
import Menu from "rc-menu";
import Input from "rc-input";
import { PontSpec } from "pontx-spec";

export class APIDirectoryComponentProps {
  search: string;
  setSearch: (search: string) => any;
  debouncedSearch: string;
  dirs: DirectoryNode[] = [];
  changeDirs = (dirs: DirectoryNode[]): any => {};
  selectNode: (nodeName: string, nodeType: string) => void = () => {};
  currentKey: string;
  isAPIDocsLoading: boolean;
  startTransition: (callback: () => void) => void;
  loadingTips? = "正在加载中...";
  pontxSpec: PontSpec;
}

export const APIDirectoryComponent: React.FC<APIDirectoryComponentProps> = (props) => {
  const { debouncedSearch, dirs, changeDirs, selectNode, currentKey, isAPIDocsLoading, startTransition } = props;
  const openKeys = DirectoryNode.findOpenKeys(dirs);

  const [selectedKey, setSelectedKey] = React.useState(currentKey);
  const selectedFullKeys = DirectoryNode.getSelectedFullKeys(dirs, selectedKey);

  React.useEffect(() => {
    if (selectedKey !== currentKey) {
      setSelectedKey(currentKey);
    }
  }, [currentKey]);

  const menus = React.useMemo(() => {
    return (
      <div className="dirs">
        {props.isAPIDocsLoading ? <div className="loading-tips">{props.loadingTips}</div> : null}
        <Menu
          motion={{ motionLeaveImmediately: true }}
          selectedKeys={[selectedKey]}
          openKeys={openKeys}
          mode="inline"
          id="workbench-api-tree"
          inlineIndent={16}
          className="workbench-api-tree-list api-directory"
          onOpenChange={(expandedKeys) => {
            const addKey = expandedKeys.filter((newKey) => !openKeys.includes(newKey));
            const deleteKey = openKeys.filter((oldKey) => !expandedKeys.includes(oldKey));
            changeDirs(DirectoryNode.toggleExpanded(dirs, addKey[0] || deleteKey[0]));
          }}
          onSelect={(item) => {
            const { type, name } = DirectoryNode.parseNodeKey(item.key);
            setSelectedKey(`${type}/${name}`);
            startTransition(() => {
              selectNode(name, type);
            });
          }}
        >
          {dirs
            .map((d) => {
              if (!d) {
                return null;
              }
              if (d.children?.length) {
                return renderSubMenuGroup(
                  d,
                  debouncedSearch,
                  selectedFullKeys?.includes(DirectoryNode.getNodeKey(d)) ? selectedFullKeys.join(",") : "",
                );
              } else {
                return renderSubMenuItem(d, debouncedSearch, selectedKey === DirectoryNode.getNodeKey(d));
              }
            })
            .filter((id) => id)}
        </Menu>
      </div>
    );
  }, [selectedKey, openKeys?.join?.(","), dirs, debouncedSearch, isAPIDocsLoading]);

  return React.useMemo(() => {
    return (
      <div
        className={classNames("pontx-directory", {
          loading: isAPIDocsLoading,
        })}
      >
        <div className="directory-header">
          <div className="spec-info">
            <div className="spec-name">{props.pontxSpec?.name}</div>
          </div>
          <Input
            type="search"
            className="pontx-directory-search"
            value={props.search}
            allowClear
            onChange={(e) => {
              props.setSearch(e.target.value);
            }}
            placeholder={"请输入关键字进行搜索"}
          />
        </div>
        {menus}
      </div>
    );
  }, [selectedKey, props.search, openKeys?.join?.(","), dirs, debouncedSearch, isAPIDocsLoading]);
};

APIDirectoryComponent.defaultProps = new APIDirectoryComponentProps();
