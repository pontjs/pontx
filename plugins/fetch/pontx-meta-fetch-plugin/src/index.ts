import fetch from "node-fetch";
import * as _ from "lodash";
import { InnerOriginConfig, PontxFetchPlugin, PontLogger, PontManager } from "pontx-manager";
import * as fs from "fs-extra";
import * as path from "path";
export default class PontMetaFetchPlugin extends PontxFetchPlugin {
  /** 翻译中文类名等 */
  async translateChinese(jsonString: string, errCallback: (err) => any) {
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

      const result = await this.innerConfig.translator.translateCollect(chineseKeyCollect);
      if (result?.length !== chineseKeyCollect.length) {
        throw new Error("翻译失败");
      }
      // const normalizeRegStr = (str: string) => str.replace(/(\W)/g, '$1');
      const toRegStr = (str) => str.replace(/(\W)/g, "\\$1");
      result.forEach((enKey: string, index) => {
        const chineseKey = chineseKeyCollect[index];
        // this.report(chineseKey + ' ==> ' + enKey);
        if (enKey) {
          retString = retString.replace(eval(`/${toRegStr(chineseKey)}/g`), enKey);
        }
      });
      await this.innerConfig.translator.saveCacheFile();
      return retString;
    } catch (err) {
      errCallback(err);
      return retString;
    }
  }

  async apply(originConf: InnerOriginConfig, options: any) {
    let remoteStr = "";

    if (originConf.url?.startsWith("./") || originConf.url?.startsWith("../")) {
      const filePath = path.join(this.innerConfig.configDir, originConf.url);
      try {
        remoteStr = await fs.readFile(filePath, "utf-8");
      } catch (e) {}
    } else {
      try {
        remoteStr = await fetch(originConf.url, {}).then((res) => res.text());
      } catch (e) {
        this.logger.error({
          originName: originConf.name,
          message: `远程数据获取失败，请确认您配置的 pont origin url(${
            originConf.url || ""
          })，在您当前的网络环境中允许访问。${e.message}`,
          processType: "fetch",
        });
        return;
      }
    }

    try {
      const metaStr = await this.translateChinese(remoteStr, (err) => {
        this.logger.error({
          originName: originConf.name,
          message: `元数据中的中文翻译失败，请查看您的网络环境: ${err.message}`,
          stack: err.stack,
          processType: "fetch",
        });
      });
      // const metaStr = remoteStr;
      this.logger.info("远程数据中非法中文已翻译成功");
      this.logger.info("远程数据获取成功");

      return metaStr;
    } catch (e) {}
  }
}
