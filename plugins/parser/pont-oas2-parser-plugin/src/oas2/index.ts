import { parseOAS2 } from "./parser";
import { PontParserPlugin } from "pont-core";
import { PontSpec } from "pont-spec";

export class PontOAS2ParserPlugin extends PontParserPlugin {
  apply(metaStr: string, options?: any): Promise<PontSpec> {
    try {
      const swaggerObj = JSON.parse(metaStr);
      return Promise.resolve(parseOAS2(swaggerObj));
    } catch (e) {
      console.log(e.stack);
      this.logger.error(e.message);
    }
  }
}
