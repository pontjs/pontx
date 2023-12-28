import * as React from "react";
import { DirectoryNode, DirectoryType } from "./type";
import classNames from "classnames";
import memoize from "lodash/fp/memoize";
import Menu from "rc-menu";
import HighlightWord from "../HighlightWord/HighlightWord";

const methodColors = {
  get: "#89C79C",
  put: "#E4AB61",
  post: "#4267E2",
  delete: "#D35D52",
};

export const renderSubMenuGroup = memoize((node: DirectoryNode, search: string, selectedFullKeys = "") => {
  const key = `${node.type}/${node.name}`;
  const keys = selectedFullKeys.split(",");
  const lastKey = keys?.[keys.length - 1];

  let titleEle = (
    <div className="lines">
      <span className="name tag-name">{node.title}</span>
    </div>
  );

  if (node.detail?.isTag) {
    titleEle = (
      <div className="lines">
        <span className="name tag-name">
          {node.name}({node.children?.length || 0})
        </span>
        <span className="sub-title tag-desc">{node.title}</span>
      </div>
    );
  }

  return (
    <Menu.SubMenu className={classNames("group", { tag: node.detail?.isTag })} key={key} title={titleEle}>
      {node.expanded
        ? node.children.map((childNode) => {
            if (childNode.children?.length) {
              return renderSubMenuGroup(
                childNode,
                keys.includes(DirectoryNode.getNodeKey(childNode)) ? selectedFullKeys : "",
              );
            }
            return renderSubMenuItem(childNode, search, lastKey === DirectoryNode.getNodeKey(childNode));
          })
        : []}
    </Menu.SubMenu>
  );
});

export const renderSubMenuItem = memoize((node: DirectoryNode, search: string, isActive: boolean) => {
  let { name, title, type, detail } = node;

  const classes = classNames("name", {
    active: isActive,
  });
  let titleEle = node.title?.trim();

  let icon = null;
  if (type === "api") {
    icon = <i className="iconfont-pontx pontx-icon-api"></i>;
  } else if (type === "struct") {
    icon = <i className="iconfont-pontx pontx-icon-struct"></i>;
  }
  let showName = name;
  if (node?.type === DirectoryType.Api && node.detail?.name) {
    showName = node.detail?.name;
  }

  if (title && name && title !== name) {
    const key = `${type}/${name}`;

    return (
      <Menu.Item key={key} className="multiple-menu">
        <div className="icon">{icon}</div>
        <div className="lines">
          <HighlightWord className={classes} keyword={search} text={showName} />
          {titleEle ? (
            <span className="sub-title" title={titleEle}>
              <HighlightWord keyword={search} text={titleEle} />
            </span>
          ) : null}
        </div>
        {detail?.method ? (
          <span className="method" style={{ color: methodColors[detail.method] || "#666" }}>
            {detail.method?.toUpperCase()}
          </span>
        ) : null}
      </Menu.Item>
    );
  } else {
    const key = `${type}/${name}`;

    return (
      <Menu.Item key={key} className="brief-menu">
        <div className="icon">{icon}</div>
        <HighlightWord className={classes} keyword={search} text={showName} />
      </Menu.Item>
    );
  }
});
