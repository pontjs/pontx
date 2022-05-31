# Pont 插件开发指南

## Pont 插件类别介绍

## Pont 插件开发

### 使用 Javascript 开发

```js
class MyTransformPlugin {
  async apply(pontSpec) {
    this.logger.info("开发转换中...");
    return pontSpec;
  }
}
exports.default = MyTransformPlugin;
```

### 使用 Typescript 开发

```js
import { parseOAS2 } from "./parser";
import { PontParserPlugin } from "pont-manager";
import { PontSpec } from "pont-spec";

export class PontOAS2ParserPlugin extends PontParserPlugin {
  apply(metaStr: string, options?: any): Promise<PontSpec> {
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
