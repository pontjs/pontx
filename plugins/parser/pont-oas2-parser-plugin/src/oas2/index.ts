import { parseOAS2 } from "./parser";
import { PontParserPlugin } from "pont-manager";
import { PontSpec } from "pont-spec";

export class PontOAS2ParserPlugin extends PontParserPlugin {
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
