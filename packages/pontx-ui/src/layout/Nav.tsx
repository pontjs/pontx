/**
 * @author jasonHzq
 * @description
 */
// import { Balloon, Button, Icon, Menu, Message, Select } from "@alicloud/console-components";
import { PontSpec } from "pontx-spec";
import * as React from "react";
import { LayoutContext, PageType } from "./context";
import "./Nav.less";

export class NavProps {}

export const Nav: React.FC<NavProps> = (props) => {
  const { currSpec, changeCurrSpec, specs, fetchPontSpecs, changePage, page } = LayoutContext.useContainer();

  return (
    <div className="pontx-ui-nav">
      <a href="javascript:;" className="logo" style={{ display: "flex", alignItems: "center" }}>
        <img src="/src/components/resources/pontx.png" height={30} />
        <span className="text">PontX</span>
      </a>
      {/* <Menu
        className="top-menu"
        mode="inline"
        direction="hoz"
        embeddable
        openKeys={[page]}
        selectedKeys={[page]}
        header={
          <div className="menu-header">
            <div className="ops" style={{ marginLeft: 30 }}>
              {specs?.length > 1 ? (
                <Select
                  value={currSpec.name}
                  onChange={(value) => {
                    changeCurrSpec(specs.find((spec) => spec.name === value) as PontSpec);
                  }}
                  size="small"
                  style={{ marginRight: 5 }}
                  dataSource={specs.map((spec) => spec.name)}
                ></Select>
              ) : null}
              <Balloon
                closable={false}
                trigger={
                  <Icon
                    type="refresh"
                    className="op"
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      fetchPontSpecs().then(() => {
                        Message.success("远程数据已同步");
                      });
                    }}
                  />
                }
              >
                同步远程数据
              </Balloon>
            </div>
          </div>
        }
      >
        <Menu.Item
          className={page === PageType.Diff ? "selected" : ""}
          key={PageType.Diff}
          onClick={() => changePage(PageType.Diff)}
        >
          <i className="codicon codicon-diff"></i>Diff管理
        </Menu.Item>
        <Menu.Item
          className={page === PageType.Doc ? "selected" : ""}
          key={PageType.Doc}
          onClick={() => changePage(PageType.Doc)}
        >
          <i className="codicon codicon-book"></i>API 文档
        </Menu.Item>
      </Menu> */}
    </div>
  );
};

Nav.defaultProps = new NavProps();
