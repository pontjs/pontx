import { PontxJsonSchema } from "../schema.js";
import _ from "lodash";

/**
 * 解析 JSON Schema 中的 $ref 引用
 * @param obj 可能包含 $ref 的对象
 * @param root 根文档（用于查找引用）
 * @returns 解析后的对象，如果是非引用对象则返回原对象，如果引用不存在则返回 null
 */
export function resolveRef<T>(
  obj: T | { $ref: string },
  root: object
): T | null {
  if (!obj || typeof obj !== "object") {
    return obj as T;
  }

  const ref = (obj as any)["$ref"];
  if (!ref || typeof ref !== "string" || !ref.startsWith("#/")) {
    return obj as T;
  }

  // 解析 JSON 指针路径: "#/components/requestBodies/Xxx" -> ["components", "requestBodies", "Xxx"]
  const pathParts = ref.slice(2).split("/");

  let current: any = root;
  for (const part of pathParts) {
    // 处理 JSON 指针转义: ~1 -> /, ~0 -> ~
    const decodedPart = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (current == null || typeof current !== "object") {
      return null;
    }
    current = current[decodedPart];
  }

  return current ?? null;
}

/**
 * Swagger 类型兼容
 */
export const PrimitiveTypeMap = {
  /* void */
  Void: { type: "void" },
  void: { type: "void" },
  List: { type: "array" },
  Set: { type: "array" },
  ArrayList: { type: "array" },
  JSONArray: { type: "array" },
  Array: { type: "array" },
  Collection: { type: "array" },
  int: {
    type: "number",
    format: "int32",
  },
  long: {
    type: "number",
    format: "int64",
  },
  double: {
    type: "number",
  },
  float: {
    type: "number",
  },
  Integer: {
    type: "number",
  },
  integer: {
    type: "number",
  },
};

export const PRIMITIVE_TYPES = [
  "array",
  "number",
  "string",
  "boolean",
  "object",
  "integer",
];

export function toUpperFirstLetter(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function getIdentifierFromUrl(
  url: string,
  requestType: string,
  samePath = ""
) {
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
const REPLACE_WORDS = [
  "remove",
  "exporting",
  "importing",
  "create",
  "functionLoad",
];

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

  if (
    segs.every(
      (seg, index) => index === 0 || seg.firstSeg === segs[index - 1].firstSeg
    )
  ) {
    return getMaxSamePath(
      segs.map((seg) => seg.restSegs.join("/")),
      samePath + "/" + segs[0].firstSeg
    );
  }

  return samePath;
}

/** 正则检测是否包含中文名 */
export function hasChinese(str: string) {
  return (
    str &&
    str.match(
      /[\u4E00-\u9FCC\u3400-\u4DB5\uFA0E\uFA0F\uFA11\uFA13\uFA14\uFA1F\uFA21\uFA23\uFA24\uff1a\uff0c\uFA27-\uFA29]|[\ud840-\ud868][\udc00-\udfff]|\ud869[\udc00-\uded6\udf00-\udfff]|[\ud86a-\ud86c][\udc00-\udfff]|\ud86d[\udc00-\udf34\udf40-\udfff]|\ud86e[\udc00-\udc1d]|[\uff01-\uff5e\u3000-\u3009\u2026]/
    )
  );
}

/** 检测是否包含非变量字符，如中文字符 */
export function checkHasNonVarialbeCh(str: string) {
  return hasChinese(str) || str.includes("/");
}

export function checkIsCamel(str: string) {
  return str.match(/^[A-Za-z]+[A-Za-z0-9]*$/);
}

export function transformTagName(name: string) {
  let words = [] as string[];
  if (typeof name !== "string") {
    throw new Error("name is not a string: " + name);
  }
  if (!name) {
    return name;
  }

  if (
    ["-", " ", "_", "/", "^", "%", "*", "?", "="].some((char) =>
      name.includes(char)
    )
  ) {
    words = name.split(/[\s-_\/\^%\*\?\=]+/);
  } else {
    if (name.endsWith("Controller")) {
      name = name.slice(0, name.length - "Controller".length);
    }
    return name;
  }

  let result = "";
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
export function processDuplicateNameSpaceName(
  directories: { namespace: string }[]
) {
  directories.forEach((dir, dirIndex) => {
    const currName = dir.namespace;
    const sameMods = directories
      .slice(dirIndex)
      .filter(
        (_dir) => _dir.namespace.toLowerCase() === currName.toLowerCase()
      );

    if (sameMods.length > 1) {
      sameMods.forEach(
        (dupMod, dupIndex) =>
          (dupMod.namespace = dupMod.namespace + ("" + dupIndex + 1))
      );
    }
  });
}

export function makeNamesUnique(names: string[]) {
  const nameIndexMap = new Map<string, number>();

  return names.map((name) => {
    if (nameIndexMap.has(name)) {
      const newCnt = nameIndexMap.get(name) + 1;
      nameIndexMap.set(name, newCnt);
      nameIndexMap.set(`${name}${newCnt}`, 1);
      return `${name}${newCnt}`;
    }

    nameIndexMap.set(name, 1);
    return name;
  });
}

export function lowerFirstLetter(str: string) {
  if (!str) {
    return str;
  }
  return str.slice(0, 1).toLowerCase() + str.slice(1);
}

export function unionSchemas(
  schemas: { name: string; schema: PontxJsonSchema }[]
) {
  return _.unionBy(schemas, (item) => {
    return (
      item.name + "|||" + (item?.schema?.genericTypeParameters?.length || 0)
    );
  });
}
