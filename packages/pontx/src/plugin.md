## 插件系统

插件系统是 Pontx 的核心，负责管理插件的加载、执行和生命周期。

## 插件设计

每个插件都可植入不同生命周期方法，如 configResolved、fetch、parseFetchedString、transform、generate、generateEntry、mocks。

每个插件 hook 的 kind：

- configResolved: async, sequential
- fetch: first
- parseFetchedString: sequential
- transform: sequential
- generate: first
