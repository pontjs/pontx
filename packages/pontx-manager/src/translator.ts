import * as path from "path";
import * as _ from "lodash";
const { youdao, google } = require("translation.js");
import * as assert from "assert";
import { PontDictManager } from "./LocalDictManager";
const baiduTranslateService = require("baidu-translate-service");

export class TranslateOptions {
  cacheFilePath?: string;
  baidu?: {
    appId: string;
    secret: string;
  };
  engines?: Array<{
    translate: string;
  }>;
}

export class Translate {
  private PontDictManager = null;
  private dictName = "dict.json";
  private engines = [
    {
      name: "baiduOpen",
      translate: (text) => {
        const { appId, secret } = this.translateOptions?.baidu || {};
        return baiduTranslateService({ appid: appId, key: secret, q: text, to: "en", from: "auto" })
          .then((data) => {
            try {
              if (data.error_msg) {
                throw new Error(data.error_msg);
              }
              return _.get(data, "trans_result");
            } catch (error) {
              throw new Error(error.message);
            }
          })
          .catch((err) => {
            throw new Error(err.message);
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
  ];
  dict = {} as { [cn: string]: string };

  constructor(private logger, private translateOptions: TranslateOptions = {}, private config: any = {}) {
    let localDictDir = undefined;
    if (translateOptions?.cacheFilePath) {
      this.dictName = path.basename(translateOptions?.cacheFilePath);
      localDictDir = path.resolve(this.config?.configDir, path.dirname(translateOptions.cacheFilePath));
    }
    if (translateOptions?.engines && translateOptions?.engines.length > 0) {
      this.loadEngines(translateOptions);
    }
    this.PontDictManager = PontDictManager(localDictDir);
    const localDict = this.PontDictManager.loadFileIfExistsSync(this.dictName);

    if (localDict) {
      try {
        this.dict = JSON.parse(localDict);
      } catch (err) {
        logger.error("[translate] local dict is invalid, attempting auto fix");
        this.PontDictManager.removeFile(this.dictName);
        this.dict = {};
      }
    }
  }

  loadEngines(translateOptions) {
    translateOptions?.engines.forEach(async (engine) => {
      const engineDirname = path.resolve(this.config?.configDir, engine.translate);
      const translate = await import(engineDirname);
      const name = engine.translate.includes(".") ? engine.translate.split(".")[0] : engine.translate;
      this.engines.unshift({
        name,
        translate: translate?.default || translate,
      });
    });
  }

  async saveCacheFile() {
    const latestDict = this.PontDictManager.loadJsonFileIfExistsSync(this.dictName);
    const dict = {
      ...(latestDict || {}),
      ...(this.dict || {}),
    };
    return this.PontDictManager.saveFile(this.dictName, JSON.stringify(dict, null, 2));
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

  async translateCollect(texts: string[], engineIndex = 0) {
    const needTranslatedTexts = texts.filter((text) => !this.dict[text]);

    if (engineIndex >= this.engines.length) {
      throw new Error("translate error, all translate engine can not access");
    }

    if (needTranslatedTexts.length === 0) {
      return texts.map((text) => this.dict[text]);
    }

    let index = engineIndex;

    try {
      if (this.engines[index].name === "baiduOpen") {
        const collectText = needTranslatedTexts.join("\n\n");
        let collectResults = await this.engines[index].translate(collectText);
        (collectResults || []).forEach((item) => {
          const { src, dst } = item;
          if (src && dst && !src.includes?.("\n")) {
            this.appendToDict({ cn: src, en: this.startCaseClassName(dst) });
          }
        });
      } else {
        needTranslatedTexts.forEach(async (text) => {
          let result = await this.engines[index].translate(text);
          this.appendToDict({ cn: text, en: this.startCaseClassName(result) });
        });
      }

      await this.saveCacheFile();
      return texts.map((text) => this.dict[text]);
    } catch (err) {
      this.logger.error(
        `translateEngine:${this.engines[index].name}`,
        `options:`,
        `${this.translateOptions}`,
        `err:${err}`,
      );
      return this.translateCollect(texts, index + 1);
    }
  }
}
