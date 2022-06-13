/**
 * @author jsonHzq
 * @description diff 管理
 * @todo 模块整体批量处理
 * @todo 页面整体批量处理
 * @todo 页面diff细节
 */
import { Balloon, Input, Menu, Message, Table } from "@alicloud/console-components";
import * as _ from "lodash";
import * as React from "react";
import { LayoutContext } from "../../layout/context";
import * as PontSpec from "pont-spec";
import { diffPontSpec, DiffResult } from "pont-spec-diff";
import "./DiffManager.less";
import { SpecMenus } from "./SpecMenus";
import { mapifyImmutableOperate, mapifyGet } from "pont-spec";
import { changeAllMetaProcessType, getDiffs, getNewSpec, getPontSpecByProcessType, ProcessedDiffs } from "./utils";
import { PontUIService } from "../../service";
import { API } from "../apiDoc/API";
import { BaseClass } from "../apiDoc/BaseClass";

export class DiffManagerProps {}

export const DiffManager: React.FC<DiffManagerProps> = (props) => {
  const { currSpec, changeCurrSpec, changeSelectedMeta, remoteSpecs, fetchPontSpecs } = LayoutContext.useContainer();
  const [inputValue, changeInputValue] = React.useState("");
  const [searchValue, _changeSearchValue] = React.useState("");
  const changeSearchValue = React.useCallback((val: any) => {
    return _.debounce(_changeSearchValue)(val);
  }, []);

  const [diffs, changeDiffs] = React.useState({} as any as ProcessedDiffs<PontSpec.PontSpec>);
  const remoteSpec = remoteSpecs?.find((spec) => spec.name === currSpec?.name) || remoteSpecs[0];
  React.useEffect(() => {
    if (currSpec && remoteSpec) {
      const defaultDiffs = diffPontSpec(currSpec, remoteSpec);
      console.log(defaultDiffs);
      changeDiffs(defaultDiffs as any);
    }
  }, [currSpec, remoteSpecs]);

  const commit = () => {
    const newSpec = getNewSpec(diffs, currSpec, remoteSpec);
    Message.loading({
      duration: 0,
      title: "变更提交中...",
    });

    Promise.resolve(PontUIService.updateLocalSpec(newSpec)).then(
      (result) => {
        Promise.resolve(fetchPontSpecs()).then(
          () => {
            Message.hide();
            Message.success("本地元数据更新成功！");
          },
          (e) => {
            Message.hide();
            Message.success("本地元数据更新成功！");
          },
        );
      },
      (e) => {
        Message.hide();
      },
    );
  };
  const textMap = {
    delete: "D",
    update: "M",
    create: "C",
    equal: "E",
  };
  const labelMap = {
    delete: "传入的新元数据中已删除",
    update: "传入的新元数据中已更新",
    create: "传入的新元数据中已新增",
    equal: "与传入的新元数据等同，但子元数据存在不同",
  };

  const renderDiffItem = <T,>(
    diffResult: ProcessedDiffs<T>,
    props: {
      childrenKey?: string;
      mappifyPath: string[];
      description?: string;
      name?: string;
    },
  ) => {
    const { childrenKey = "", mappifyPath } = props;
    const diffType = (
      <>
        {diffResult?.type === "update" && Object.keys(diffResult?.diffs || {})?.length ? (
          <Balloon trigger={<i className="codicon codicon-diff"></i>} triggerType="hover" closable={false}>
            {getDiffs(diffResult)}
          </Balloon>
        ) : null}
        <Balloon
          trigger={<span className={"diff-type " + diffResult.type}>{textMap[diffResult.type]}</span>}
          triggerType="hover"
          closable={false}
        >
          {labelMap[diffResult.type]}
        </Balloon>
      </>
    );

    let diffLabel = null as any;

    switch (diffResult.processType) {
      case "staged": {
        diffLabel = (
          <div className="diff-label">
            <Balloon
              trigger={
                <i
                  className="codicon codicon-diff-removed"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeDiffs(mapifyImmutableOperate(diffs, "assign", [...mappifyPath, "processType"], "untracked"));
                  }}
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              取消暂存
            </Balloon>
            {diffResult?.[childrenKey]?.length ? (
              <>
                <Balloon
                  trigger={
                    <i
                      onClick={(e) => {
                        e.stopPropagation();
                        const children = mapifyGet(diffs, [...mappifyPath, childrenKey]);
                        const newChildren = (children || []).map((item) => {
                          return { ...item, processType: "untracked" };
                        });
                        const pathResult = mapifyGet(diffs, mappifyPath);
                        const newPathResult = { ...pathResult, [childrenKey]: newChildren, processType: "untracked" };
                        changeDiffs(mapifyImmutableOperate(diffs, "assign", mappifyPath, newPathResult));
                      }}
                      className="codicon codicon-removed"
                    ></i>
                  }
                  triggerType="hover"
                  closable={false}
                >
                  批量取消暂存
                </Balloon>
              </>
            ) : null}

            {diffType}
          </div>
        );
        break;
      }
      case "discard": {
        diffLabel = (
          <div className="diff-label">
            {/* <Balloon
                trigger={
                  <i
                    className="codicon codicon-diff-removed"
                    onClick={(e) => {
                      e.stopPropagation();
                      changeDiffs(
                        mapifyImmutableOperate(diffs, "assign", [...mappifyPath, "processType"], "untracked"),
                      );
                    }}
                  ></i>
                }
                triggerType="hover"
                closable={false}
              >
                取消废弃，重新处理
              </Balloon> */}
            {/* {diffResult?.[childrenKey]?.length ? (
                <>
                  <Balloon
                    trigger={
                      <i
                        onClick={(e) => {
                          e.stopPropagation();
                          const children = mapifyGet(diffs, [...mappifyPath, childrenKey]);
                          const newChildren = (children || []).map((item) => {
                            return { ...item, processType: "untracked" };
                          });
                          const pathResult = mapifyGet(diffs, mappifyPath);
                          const newPathResult = { ...pathResult, [childrenKey]: newChildren, processType: "untracked" };
                          changeDiffs(mapifyImmutableOperate(diffs, "assign", mappifyPath, newPathResult));
                        }}
                        className="codicon codicon-removed"
                      ></i>
                    }
                    triggerType="hover"
                    closable={false}
                  >
                    批量取消废弃
                  </Balloon>
                </>
              ) : null} */}

            {diffType}
          </div>
        );
        break;
      }
      // 未处理
      case "untracked": {
        diffLabel = (
          <div className="diff-label">
            {((diffResult.type as any) || "equal") !== "equal" ? (
              <>
                {/* <Balloon
                    trigger={
                      <i
                        className="codicon codicon-diff-removed"
                        onClick={(e) => {
                          e.stopPropagation();
                          changeDiffs(
                            mapifyImmutableOperate(diffs, "assign", [...mappifyPath, "processType"], "discard"),
                          );
                        }}
                      ></i>
                    }
                    triggerType="hover"
                    closable={false}
                  >
                    废弃变更
                  </Balloon> */}
                <Balloon
                  trigger={
                    <i
                      onClick={(e) => {
                        e.stopPropagation();
                        changeDiffs(mapifyImmutableOperate(diffs, "assign", [...mappifyPath, "processType"], "staged"));
                      }}
                      className="codicon codicon-diff-added"
                    ></i>
                  }
                  triggerType="hover"
                  closable={false}
                >
                  暂存变更
                </Balloon>
              </>
            ) : null}
            {diffResult?.[childrenKey]?.length ? (
              <>
                {/* <Balloon
                    trigger={
                      <i
                        onClick={(e) => {
                          e.stopPropagation();
                          const children = mapifyGet(diffs, [...mappifyPath, childrenKey]);
                          const newChildren = (children || []).map((item) => {
                            return { ...item, processType: "discard" };
                          });
                          const pathResult = mapifyGet(diffs, mappifyPath);
                          const newPathResult = { ...pathResult, [childrenKey]: newChildren, processType: "discard" };
                          changeDiffs(mapifyImmutableOperate(diffs, "assign", mappifyPath, newPathResult));
                        }}
                        className="codicon codicon-collapse-all"
                      ></i>
                    }
                    triggerType="hover"
                    closable={false}
                  >
                    批量废弃模块中所有的变更
                  </Balloon> */}
                <Balloon
                  trigger={
                    <i
                      onClick={(e) => {
                        e.stopPropagation();
                        const children = mapifyGet(diffs, [...mappifyPath, childrenKey]);
                        const newChildren = (children || []).map((item) => {
                          return { ...item, processType: "staged" };
                        });
                        const pathResult = mapifyGet(diffs, mappifyPath);
                        const newPathResult = { ...pathResult, [childrenKey]: newChildren, processType: "staged" };
                        changeDiffs(mapifyImmutableOperate(diffs, "assign", mappifyPath, newPathResult));
                      }}
                      className="codicon codicon-add"
                    ></i>
                  }
                  triggerType="hover"
                  closable={false}
                >
                  批量暂存模块中所有的变更
                </Balloon>
              </>
            ) : null}

            {diffType}
          </div>
        );
        break;
      }
    }

    return (
      <div className={"diff-item"}>
        <div className={"item-label " + diffResult.type}>
          <div
            className="name"
            title={diffResult.name}
            style={{ textDecoration: diffResult.type === "delete" ? "line-through" : "none" }}
          >
            {props.name || diffResult.name}
          </div>
          <div className="desc" title={props.description || diffResult.description}>
            {props.description || diffResult.description}
          </div>
        </div>
        {diffLabel}
      </div>
    );
  };

  const stagedSpec = getPontSpecByProcessType(diffs as any, "staged");
  // const discardedSpec = getPontSpecByProcessType(diffs as any, "discard");
  const unTrackedSpec = getPontSpecByProcessType(diffs as any, "untracked");
  const renderModLabel = React.useCallback(
    (diffMod) => {
      return (
        <div className="mod-name">
          {renderDiffItem(diffMod, {
            childrenKey: "interfaces",
            mappifyPath: ["mods", diffMod.name],
            name: diffMod.interfaces?.length ? diffMod.name + `(${diffMod.interfaces?.length})` : diffMod.name,
          })}
        </div>
      );
    },
    [diffs],
  );
  const renderApiLabel = React.useCallback(
    (mod, api) => {
      const newApi = { ...api, type: api.type || mod.type };
      return (
        <div className="api-name">
          {renderDiffItem(newApi, {
            mappifyPath: ["mods", mod.name, "interfaces", api.name],
          })}
        </div>
      );
    },
    [diffs],
  );

  const renderClazzLabel = React.useCallback(
    (clazz) => {
      return (
        <div className="api-name">
          {renderDiffItem(clazz, {
            mappifyPath: ["baseClasses", clazz.name],
            description: `${clazz.schema?.description || clazz?.schema?.title}`,
          })}
        </div>
      );
    },
    [diffs],
  );

  return React.useMemo(() => {
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
      <Menu defaultOpenAll mode="inline" inlineIndent={20}>
        {/* <Menu.Divider key={"discard-devider"}>
          已废弃
          <div className="right-icons">
            <Balloon
              trigger={
                <i
                  className="codicon codicon-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeDiffs(changeAllMetaProcessType(diffs, "discard", "untracked") as any);
                  }}
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              取消所有已废弃变更
            </Balloon>
          </div>
        </Menu.Divider>
        {SpecMenus({
          key: "discard",
          pontSpec: discardedSpec as any,
          renderModLabel: renderModLabel,
          renderApiLabel: renderApiLabel,
          renderClazzLabel: renderClazzLabel,
        })} */}
        <Menu.Divider key={"staged-devider"}>
          已暂存变更({stagedSpec?.mods?.length + (stagedSpec?.baseClasses?.length ? 1 : 0)})
          <div className="right-icons">
            <Balloon
              trigger={
                <i
                  onClick={(e) => {
                    e.stopPropagation();
                    commit();
                  }}
                  className="codicon codicon-check"
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              提交变更，更新本地代码
            </Balloon>
            <Balloon
              trigger={
                <i
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  className="codicon codicon-refresh"
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              刷新
            </Balloon>
            <Balloon
              trigger={
                <i
                  className="codicon codicon-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeDiffs(changeAllMetaProcessType(diffs, "staged", "untracked") as any);
                  }}
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              取消所有已暂存变更
            </Balloon>
          </div>
        </Menu.Divider>
        {SpecMenus({
          key: "staged",
          pontSpec: stagedSpec as any,
          changeSelectedMeta,
          renderModLabel: renderModLabel,
          renderApiLabel: renderApiLabel,
          renderClazzLabel: renderClazzLabel,
        })}
        <Menu.Divider key={"untracked-devider"}>
          未处理变更({unTrackedSpec?.mods?.length + (unTrackedSpec?.baseClasses?.length ? 1 : 0)})
          <div className="right-icons">
            {/* <Balloon
              trigger={
                <i
                  className="codicon codicon-discard"
                  onClick={(e) => {
                    e.stopPropagation();
                    changeDiffs(changeAllMetaProcessType(diffs, "untracked", "discard") as any);
                  }}
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              废弃以下所有远程变更
            </Balloon> */}
            <Balloon
              trigger={
                <i
                  onClick={(e) => {
                    e.stopPropagation();
                    changeDiffs(changeAllMetaProcessType(diffs, "untracked", "staged") as any);
                  }}
                  className="codicon codicon-add"
                ></i>
              }
              triggerType="hover"
              closable={false}
            >
              暂存以下所有远程变更
            </Balloon>
          </div>
        </Menu.Divider>
        {SpecMenus({
          key: "untracked",
          changeSelectedMeta,
          pontSpec: unTrackedSpec as any,
          renderModLabel: renderModLabel,
          renderApiLabel: renderApiLabel,
          renderClazzLabel: renderClazzLabel,
        })}
      </Menu>
    );

    return (
      <>
        <div className="pont-ui-left-menu pont-ui-diff-menu">
          <div className="top-area">
            <span>
              模块变更共计({(diffs.mods || []).length})
              <span style={{ marginLeft: 20 }}>数据结构变更共计({(diffs.baseClasses || []).length})</span>
            </span>
          </div>
          {menus}
        </div>
      </>
    );
  }, [diffs]);
};

DiffManager.defaultProps = new DiffManagerProps();
