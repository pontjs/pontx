import { parseOAS3 } from "./parser";
import { PontxParserPlugin } from "pontx-manager";
import { PontSpec } from "pontx-spec";

export class PontOAS3ParserPlugin extends PontxParserPlugin {
  apply(metaStr: string, specName: string, options?: any): Promise<PontSpec> {
    try {
      let swaggerObj = null;

      try {
        swaggerObj = JSON.parse(metaStr);
      } catch (e) {
        this.logger.error("当前获取到的远程元数据不符合 JSON 格式，无法解析为 pont spec。元数据为：" + metaStr);
        return;
      }

      const origin =
        this.innerConfig?.origins?.find((origin) => origin?.name === specName) || this.innerConfig?.origins?.[0];
      const originUrl = origin?.url;

      return Promise.resolve(parseOAS3(swaggerObj, specName, this.innerConfig.translator, originUrl));
    } catch (e) {
      console.log(e.stack);
      this.logger.error(e.message);
    }
  }
}
