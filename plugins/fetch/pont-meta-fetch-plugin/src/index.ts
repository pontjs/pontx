import fetch from "node-fetch";
import * as _ from "lodash";
import { InnerOriginConfig, PontFetchPlugin } from "pont-manager";
import { Translate } from "./translator";

let Translator: Translate;
export default class PontMetaFetchPlugin extends PontFetchPlugin {
  /** 翻译中文类名等 */
  static async translateChinese(jsonString: string) {
    let retString = jsonString;
    try {
      const matchItems = jsonString
        // 匹配中英文混合及包含 空格，«，»，-, (,)的情况
        .match(/"[a-z0-9\s-]*[\u4e00-\u9fa5]+[a-z0-9\s-«»()\u4e00-\u9fa5]*":/gi);
      if (!matchItems) {
        return retString;
      }

      let chineseKeyCollect = matchItems.map((item) => item.replace(/["":]/g, ""));

      // 去重
      chineseKeyCollect = _.uniq(chineseKeyCollect.map((item) => (item.includes("«") ? item.split("«")[0] : item)));

      // 按长度倒序排序，防止替换时中文名部分重名
      // 例如: 请求参数vo, 请求参数, 替换时先替换 请求参数vo, 后替换请求参数
      chineseKeyCollect.sort((pre, next) => next.length - pre.length);

      let result = await Promise.all(chineseKeyCollect.map((text) => Translator.translateAsync(text)));
      // const normalizeRegStr = (str: string) => str.replace(/(\W)/g, '$1');
      const toRegStr = (str) => str.replace(/(\W)/g, "\\$1");
      result.forEach((enKey: string, index) => {
        const chineseKey = chineseKeyCollect[index];
        // this.report(chineseKey + ' ==> ' + enKey);
        if (enKey) {
          retString = retString.replace(eval(`/${toRegStr(chineseKey)}/g`), enKey);
        }
      });
      return retString;
    } catch (err) {
      return retString;
    }
  }

  async apply(originConf: InnerOriginConfig) {
    Translator = new Translate(this.logger);

    try {
      const remoteStr = await fetch(originConf.url, {}).then((res) => res.text());
      const metaStr = await PontMetaFetchPlugin.translateChinese(remoteStr);
      // const metaStr = remoteStr;
      this.logger.info("远程数据中非法中文已翻译成功");
      this.logger.info("远程数据获取成功");

      return metaStr;
    } catch (e) {
      this.logger.error({
        originName: originConf.name,
        message: `远程数据获取失败，请确认您配置的 pont origin url(${
          originConf.url || ""
        })，在您当前的网络环境中允许访问`,
        processType: "fetch",
      });
    }
  }
}
