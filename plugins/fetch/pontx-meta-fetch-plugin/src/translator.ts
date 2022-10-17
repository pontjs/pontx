import * as _ from "lodash";
const { youdao, baidu, google } = require("translation.js");
import * as assert from "assert";
import { PontDictManager } from "./LocalDictManager";

export class Translate {
  private engines = [youdao, google, baidu];
  dict = {};

  constructor(logger, private dictName = "dict.json") {
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
      enKey = this.startCaseClassName(res.result[0]);

      assert.ok(enKey);

      this.appendToDict({ cn: text, en: enKey });
      return enKey;
    } catch (err) {
      return this.translateAsync(text, index + 1);
    }
  }
}
