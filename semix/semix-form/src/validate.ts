import { Validator, ValidatorOptions } from "semix-validate";

export const baseValidate = (json: any, options: ValidatorOptions) => {
  let errors = new Validator({
    ignoredSchemaPaths: [],
    keywordItems: [],
    metaCtx: {},
    rules: [],
    ignoredCoreSchemaValidate: false,
    schema: options.schema,
    langs: options.langs,
  }).validate(json, options.metaCtx);

  errors = (errors || []).map((error) => {
    switch (error.keyword) {
      case "enum": {
        return {
          ...error,
          message: "取值范围应当在" + error.schema?.enum.join(", ") + "之中",
        };
      }

      // 正则校验
      case "pattern": {
        return {
          ...error,
          message: "不符合正则表达式: " + error.schema?.pattern,
        };
      }
    }

    return error;
  });

  return errors
    .map((error) => {
      if (error.keyword === "required") {
        const errorKeys = error?.ext || [];
        return errorKeys.map((key: string) => {
          return {
            ...error,
            dataPath: error.dataPath ? error.dataPath + "." + key : key,
            message: "字段必填",
          };
        });
      }

      return [error];
    })
    .reduce((pre, curr) => pre.concat(curr), []);
};
