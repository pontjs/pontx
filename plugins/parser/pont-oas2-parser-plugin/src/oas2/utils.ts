import { OAS2 } from "oas-spec-ts";
import { BaseClass, Interface, Mod, PontJsonSchema } from "pont-spec";
import * as _ from "lodash";

/**
 * Swagger 类型兼容
 */
export const PrimitiveTypeMap = {
  /* void */
  Void: "void",
  void: "void",

  /* Array */
  List: "Array",
  Collection: "Array",
};

export class JsonSchemaContext {
  classTemplateArgs: PontJsonSchema[] = [];
  compileTemplateKeyword = "#/definitions/";
  defNames: string[] = [];
  samePath? = "";

  static handleContext(context: JsonSchemaContext, schema: PontJsonSchema) {
    if (context?.defNames?.includes(schema.typeName)) {
      schema.isDefsType = true;
    }

    if (context?.classTemplateArgs?.length) {
      const codes = (context?.classTemplateArgs || []).map((arg) => PontJsonSchema.toString(arg));
      const index = codes.indexOf(PontJsonSchema.toString(schema));

      (schema.templateArgs || []).forEach((arg) => JsonSchemaContext.handleContext(context, arg));
      schema.templateIndex = index;
    }
  }
}

export function toUpperFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getIdentifierFromUrl(url: string, requestType: string, samePath = "") {
  const currUrl = url.slice(samePath.length).match(/([^\.]+)/)[0];

  return (
    requestType +
    currUrl
      .split("/")
      .map((str) => {
        if (str.includes("-")) {
          str = str.replace(/(\-\w)+/g, (_match, p1) => {
            if (p1) {
              return p1.slice(1).toUpperCase();
            }
          });
        }

        if (str.match(/^{.+}$/gim)) {
          return "By" + toUpperFirstLetter(str.slice(1, str.length - 1));
        }
        return toUpperFirstLetter(str);
      })
      .join("")
  );
}

/** some reversed keyword in js but not in java */
const TS_KEYWORDS = ["delete", "export", "import", "new", "function"];
const REPLACE_WORDS = ["remove", "exporting", "importing", "create", "functionLoad"];

export function getIdentifierFromOperatorId(operationId: string) {
  const identifier = operationId.replace(/(.+)(Using.+)/, "$1");

  const index = TS_KEYWORDS.indexOf(identifier);

  if (index === -1) {
    return identifier;
  }

  return REPLACE_WORDS[index];
}

export function toDashCase(name: string) {
  const dashName = name
    .split(" ")
    .join("")
    .replace(/[A-Z]/g, (p) => "-" + p.toLowerCase());

  if (dashName.startsWith("-")) {
    return dashName.slice(1);
  }

  return dashName;
}

export function getMaxSamePath(paths: string[], samePath = "") {
  if (!paths.length) {
    return samePath;
  }

  if (paths.some((path) => !path.includes("/"))) {
    return samePath;
  }

  const segs = paths.map((path) => {
    const [firstSeg, ...restSegs] = path.split("/");
    return { firstSeg, restSegs };
  });

  if (segs.every((seg, index) => index === 0 || seg.firstSeg === segs[index - 1].firstSeg)) {
    return getMaxSamePath(
      segs.map((seg) => seg.restSegs.join("/")),
      samePath + "/" + segs[0].firstSeg,
    );
  }

  return samePath;
}

/** 正则检测是否包含中文名 */
export function hasChinese(str: string) {
  return (
    str &&
    str.match(
      /[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uff1a\uff0c\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]|[\uff01-\uff5e\u3000-\u3009\u2026]/,
    )
  );
}

export function transformCamelCase(name: string) {
  let words = [] as string[];
  let result = "";

  if (name.includes("-")) {
    words = name.split("-");
  } else if (name.includes(" ")) {
    words = name.split(" ");
  } else {
    if (typeof name === "string") {
      result = name;
    } else {
      throw new Error("mod name is not a string: " + name);
    }
  }

  if (words && words.length) {
    result = words
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");
  }

  result = result.charAt(0).toLowerCase() + result.slice(1);

  if (result.endsWith("Controller")) {
    result = result.slice(0, result.length - "Controller".length);
  }

  return result;
}

/** 如果两个模块忽略大小写名称一致，则加以区分 */
export function processDuplicateModName(mods: Mod[]) {
  mods.forEach((mod, modIndex) => {
    const currName = mod.name;
    const sameMods = mods.slice(modIndex).filter((mod) => mod.name.toLowerCase() === currName.toLowerCase());

    if (sameMods.length > 1) {
      sameMods.forEach((dupMod, dupIndex) => (dupMod.name = dupMod.name + ("" + dupIndex + 1)));
    }
  });
}

/** 处理接口名重复 */
export function processDuplicateInterfaceName(interfaces: Interface[], samePath: string) {
  const names = [] as string[];

  interfaces.forEach((inter) => {
    if (!names.includes(inter.name)) {
      names.push(inter.name);
    } else {
      inter.name = getIdentifierFromUrl(inter.path, inter.method, samePath);
    }
  });
}

/** 兼容某些项目把swagger tag的name和description弄反的情况 */
export function processMod(interfaces: Interface[], tag: OAS2.TagObject) {
  if (hasChinese(tag.name)) {
    // 当检测到name包含中文的时候，采用description
    return {
      description: tag.name,
      interfaces: _.uniqBy(interfaces, "name"),
      name: transformCamelCase(tag.description),
    } as Mod;
  } else {
    return {
      description: tag.description,
      interfaces: _.uniqBy(interfaces, "name"),
      name: transformCamelCase(tag.name),
    } as Mod;
  }
}

export function deleteDuplicateBaseClass(baseClasses: BaseClass[]) {
  baseClasses.sort((pre, next) => {
    if (pre.name === next.name && pre.schema.templateArgs?.length === next.schema.templateArgs?.length) {
      return pre.schema?.templateArgs.filter(({ isDefsType }) => isDefsType).length >
        next.schema?.templateArgs.filter(({ isDefsType }) => isDefsType).length
        ? -1
        : 1;
    }

    if (pre.name === next.name) {
      return pre.schema?.templateArgs.length > next.schema?.templateArgs.length ? -1 : 1;
    }

    return next.name > pre.name ? -1 : 1;
  });

  return _.unionBy(baseClasses, (clazz) => clazz.name);
}
