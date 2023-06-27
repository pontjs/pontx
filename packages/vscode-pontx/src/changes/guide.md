RemoteSpecs
=> Changes
StagedSpecs
=> Staged Changes
_ commit: updateRemoteSpecs = (RemoteSpecs, StagedSpec, Diffs) => NewRemoteSpecs
_ unStage: updateStagedSpecs = (StagedSpec, LocalSpecs)
LocalSpecs

# 原始数据

- LocalSpecs
- RemoteSpecs

# 衍生数据

- Diff 算法
  - compare
    - Pure，判断指针相同。
  - 定制 Diff 级别。deepDiff(pre, next, stopRecurve: )
  - 定制 Diff 组装

# 渲染数据

- List(明细)
  - Label
  - iconPath
  - command
  - resourceUri for Diff 类型
  - contextValue: item key for vscode
- Tree(父子关系查询)

## 渲染方法

- getChildren
- fireEvent

## 事件

- 变更明细
- API 文档
- 打开
- Diff 管理
