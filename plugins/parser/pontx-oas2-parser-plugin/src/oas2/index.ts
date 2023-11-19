import { parseOAS2 } from "./parser";
import { PontxParserPlugin } from "pontx-manager";
import { PontSpec } from "pontx-spec";
import { PontOAS3ParserPlugin } from "pontx-oas3-parser-plugin";

export class PontOAS2ParserPlugin extends PontxParserPlugin {
  apply(metaStr: string, specName: string, options?: any): Promise<PontSpec> {
    try {
      let swaggerObj = null;

      try {
        swaggerObj = JSON.parse(metaStr);
        if (!swaggerObj?.swagger && swaggerObj?.openapi && (swaggerObj?.openapi as string)?.startsWith("3")) {
          this.logger.info("当前获取到的远程元数据为 OAS3 格式，已自动为您切换为 OAS3");
          const oas3Parser = new PontOAS3ParserPlugin();
          oas3Parser.innerConfig = this.innerConfig;
          oas3Parser.logger = this.logger;

          return oas3Parser.apply(metaStr, specName, options);
        }
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
