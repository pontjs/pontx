import * as _ from "lodash";
const { youdao, baidu, google } = require("translation.js");
import * as assert from "assert";
import { PontDictManager } from "./LocalDictManager";
const baiduTranslator = require("baidu-translate");

export class Translate {
  private engines = [
    {
      name: "baidu",
      translate: (text) => {
        const { appId, secret } = this.translateOptions?.baidu || {};

        return baiduTranslator(appId, secret)(text, { to: "en" }).then((res) => {
          if (res.error_msg) {
            throw new Error(res.error_msg);
          }
          return _.get(res, "trans_result.0.dst");
        });
      },
    },
    {
      name: "google",
      translate: (text) => google.translate(text).then((res) => res.result[0]),
    },
    {
      name: "youdao",
      translate: (text) => youdao.translate(text).then((res) => res.result[0]),
    },
    {
      name: "baidu",
      translate: (text) => baidu.translate(text).then((res) => res.result[0]),
    },
  ];
  dict = {};

  constructor(private logger, private translateOptions: any = {}, private dictName = "dict.json") {
    const localDict = PontDictManager.loadFileIfExistsSync(this.dictName);

    if (localDict) {
      try {
        this.dict = JSON.parse(localDict);
      } catch (err) {
        logger.error("[translate] local dict is invalid, attempting auto fix");
        PontDictManager.removeFile(dictName);
        this.dict = {};
      }
    }
  }

  async saveCacheFile() {
    const latestDict = PontDictManager.loadJsonFileIfExistsSync(this.dictName);
    const dict = {
      ...(latestDict || {}),
      ...(this.dict || {}),
    };
    return PontDictManager.saveFile(this.dictName, JSON.stringify(dict, null, 2));
  }

  async appendToDict(pairKey: { cn: string; en: string }) {
    if (!this.dict[pairKey.cn]) {
      this.dict[pairKey.cn] = pairKey.en;
    }
  }

  startCaseClassName(result) {
    let wordArray = _.startCase(result).split(" ");
    if (wordArray.length > 6) {
      wordArray = [].concat(wordArray.slice(0, 5), wordArray.slice(-1));
    }
    return wordArray.join("");
  }

  async translateAsync(text: string, engineIndex = 0) {
    if (this.dict[text]) {
      return this.dict[text];
    }

    if (engineIndex >= this.engines.length) {
      throw new Error("translate error, all translate engine can not access");
    }

    let enKey;
    let index = engineIndex;

    try {
      let res = await this.engines[index].translate(text);
      enKey = this.startCaseClassName(res);

      assert.ok(enKey);

      this.appendToDict({ cn: text, en: enKey });
      return enKey;
    } catch (err) {
      this.logger.error(
        `translateEngine:${this.engines[index].name} options:${this.translateOptions} text:${text} err:${err}`,
      );
      return this.translateAsync(text, index + 1);
    }
  }
}
