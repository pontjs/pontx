# Pontx 插件开发指南

## Pontx 插件示例

* [pontx-meta-fetch-plugin](./plugins/fetch/pontx-meta-fetch-plugin)
* [pontx-eggjs-sdk-plugin](./plugins/generate/pontx-eggjs-sdk-plugin),
* [pontx-mocks-plugin](./plugins/mocks/pontx-mocks-plugin)
* [pontx-oas2-parser-plugin](./plugins/parser/pontx-oas2-parser-plugin)

## Pontx 插件开发

### 使用 Typescript 开发

```js
import { parseOAS2 } from "./parser";
import { PontxParserPlugin } from "pontx-manager";
import { PontSpec } from "pontx-spec";

export class PontOAS2ParserPlugin extends PontxParserPlugin {
  apply(metaStr: string, specName: string, options?: any): Promise<PontSpec> {
    try {
      let swaggerObj = null;

      try {
        swaggerObj = JSON.parse(metaStr);
      } catch (e) {
        this.logger.error("当前获取到的远程元数据不符合 JSON 格式，无法解析为 pont spec。元数据为：" + metaStr);
        return;
      }

      return Promise.resolve(parseOAS2(swaggerObj));
    } catch (e) {
      console.log(e.stack);
      this.logger.error(e.message);
    }
  }
}
export default PontOAS2ParserPlugin;
```



### 使用 Javascript 开发

```js
class MyTransformPlugin {
  async apply(pontxSpec) {
    this.logger.info("开发转换中...");
    return pontxSpec;
  }
}
exports.default = MyTransformPlugin;
```
