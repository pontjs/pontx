import * as React from "react";
import fp from "lodash/fp";
import _ from "lodash";
import { SemixJsonSchema, calcDynamicSchema, SEMIX_SCHEMA_FIELDS } from "semix-core";
import { SemixUISchema } from "./type";

const logger = {
  error(message: string) {
    console.error(message);
  },
};

export function usePrevious<T>(value: T) {
  const ref = React.useRef<T>();

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export const immutableSet = fp.setWith(Object);

export const getSchemaBySchemaPath = (schema: any, schemaPath: string | any[]) => {
  const moreFields = _.pickBy(schema, (value, key) => {
    if (SEMIX_SCHEMA_FIELDS.includes(key)) {
      return false;
    }
    return true;
  });
  const pathSchema = _.get(schema, schemaPath);
  const resultSchema = {
    ...moreFields,
    ...(pathSchema || {}),
  };
  return resultSchema;
};

// 根据 $ref 获取 schema
export const getSchemaByRef = (schema: any, $ref: string) => {
  if ($ref?.startsWith("#/")) {
    const paths = $ref?.slice(2)?.split("/");

    return getSchemaBySchemaPath(schema, paths);
  }

  return null;
};

const rePropName = RegExp(
  // Match anything that isn't a dot or bracket.
  "[^.[\\]]+" +
    "|" +
    // Or match property names within brackets.
    "\\[(?:" +
    // Match a non-string expression.
    "([^\"'][^[]*)" +
    "|" +
    // Or match strings (supports escaping characters).
    "([\"'])((?:(?!\\2)[^\\\\]|\\\\.)*?)\\2" +
    ")\\]" +
    "|" +
    // Or match "" as the space between consecutive dots or empty brackets.
    "(?=(?:\\.|\\[\\])(?:\\.|\\[\\]|$))",
  "g",
);
const reEscapeChar = /\\(\\)?/g;
export const stringToPaths = (str: string) => {
  if (typeof str !== "string" || !str) {
    return [];
  }
  const result = [] as string[];

  str.replace(rePropName, (match, expression, quote, subString) => {
    let key = match;
    if (quote) {
      key = subString.replace(reEscapeChar, "$1");
    } else if (expression) {
      key = expression.trim();
    }
    result.push(key);

    return "";
  });
  return result;
};

export const checkIsPathEqaul = (path1: string, path2: string) => {
  const path1Arr = stringToPaths(path1);
  const path2Arr = stringToPaths(path2);

  if (path1Arr.length !== path2Arr.length) {
    return false;
  }
  return path1Arr.every((ele, index) => {
    const path2Ele = path2Arr[index];

    if (ele === path2Ele) {
      return true;
    }

    if (ele === "*" || path2Ele === "*") {
      return true;
    }

    return false;
  });
};

const getSchemaPathByDataPaths = (schema: SemixJsonSchema, dataPaths: string[], schemaPath = "") => {
  if (!schema) {
    return schemaPath;
  }
  if (!dataPaths?.length) {
    return schemaPath;
  }
  if (schema?.$ref) {
    if (schema?.$ref?.startsWith("#/")) {
      const schemaPaths = schema?.$ref?.slice(2)?.split("/");
      let refSchema = getSchemaBySchemaPath(schema, schemaPaths);
      const resultSchemaPath = schemaPaths.join(".");
      return getSchemaPathByDataPaths(refSchema, dataPaths, resultSchemaPath);
    }
  }
  const [currentPath, ...restPaths] = dataPaths;
  let resultSchemaPath = schemaPath;

  const joinSchemaPath = (path: string) => {
    if (resultSchemaPath) {
      return resultSchemaPath + "." + path;
    }
    return path;
  };

  if (schema?.type === "object" && schema?.properties) {
    const finalSchemaPath = joinSchemaPath(`properties.["${currentPath}"]`);
    return getSchemaPathByDataPaths(
      getSchemaBySchemaPath(schema, `properties["${currentPath}"]`),
      restPaths,
      finalSchemaPath,
    );
  }
  if (schema?.type === "array" && schema?.items) {
    if (currentPath === "*") {
      return getSchemaPathByDataPaths(getSchemaBySchemaPath(schema, "items"), restPaths, joinSchemaPath(`items`));
    } else {
      logger.error(`dataPath: ${currentPath} is invalid, expect * but got ${currentPath}`);
    }
  }
  if (schema?.type === "object" && schema?.additionalProperties) {
    if (currentPath === "*" || typeof currentPath === "string" || typeof currentPath === "number") {
      joinSchemaPath(`additionalProperties`);
      return getSchemaPathByDataPaths(
        getSchemaBySchemaPath(schema, "additionalProperties"),
        restPaths,
        joinSchemaPath(`additionalProperties`),
      );
    } else {
      logger.error(`dataPath: ${currentPath} is invalid, expect string/number/* but got ${currentPath}`);
    }
  }
  console.error(`currentPath and schema is invalid`, currentPath, schema);
};

/**
 * dataPath 规范
 * apis[*].parameters[*].name.3
 * apis[*].responses[*]["schema"][3]
 */
export const getSchemaPathByDataPath = (schema: SemixJsonSchema, dataPath: string) => {
  if (!schema) {
    return "";
  }
  const paths = stringToPaths(dataPath);
  return getSchemaPathByDataPaths(schema, paths);
};

export const getFieldClassName = (schema: SemixUISchema) => {
  if (!schema) {
    return "";
  }
  const cx = [];
  if (schema?.props?.className) {
    cx.push(schema.props.className);
  }
  if (schema.disabled) {
    cx.push("disabled");
  }
  if (schema.readOnly) {
    cx.push("read-only");
  }
  if (schema?.layout?.displayType) {
    cx.push(schema.layout.displayType);
  }
  return cx.join(" ");
};

export const getNextDataPath = (dataPath: any, key: string) => {
  if (key?.includes(".")) {
    const next = `["${key}"]`;
    return dataPath ? dataPath + next : next;
  } else {
    return dataPath ? dataPath + "." + key : key;
  }
};

export const semixifySchema = (resultSchema: SemixJsonSchema, getCustomWidget?) => {
  return SemixJsonSchema.mapSchema(resultSchema, (schema: any, prop) => {
    let newSchema = { ...schema } as SemixUISchema;

    if (schema?.type === "object" && schema?.properties) {
      let newRequired = Object.keys(schema.properties).filter((key) => {
        return schema.properties[key].required || schema.properties[key].isRequired;
      });
      let newProperties = schema?.properties;
      if (schema?.required?.length) {
        newRequired = [...schema.required, ...newRequired];
        newProperties = _.mapValues(schema.properties, (value, key) => {
          if (schema.required.includes(key)) {
            return { ...value, isRequired: true };
          }
          return value;
        });
      }

      return {
        ...newSchema,
        required: newRequired,
        properties: newProperties,
      };
    }
    const widget = getCustomWidget?.(newSchema as any);
    if (widget) {
      newSchema.widget = widget;
    }
    return newSchema;
  });
};

export const filterFormDataBySchema = (formData: any, schema: SemixJsonSchema) => {
  if (
    schema?.type === "object" &&
    schema?.properties &&
    formData &&
    typeof formData === "object" &&
    !Array.isArray(formData)
  ) {
    return _.mapValues(schema.properties, (prop, key) => {
      if (Object.prototype.hasOwnProperty.call(formData, key)) {
        const propSchema = getSchemaBySchemaPath(schema, `properties["${key}"]`);
        return filterFormDataBySchema(formData[key], propSchema);
      }
    });
  }
  if (schema?.type === "array" && schema?.items && Array.isArray(formData)) {
    return formData.map((item, index) => {
      const propSchema = getSchemaBySchemaPath(schema, `items`);
      return filterFormDataBySchema(item, propSchema);
    });
  }
  if (
    schema?.type === "object" &&
    schema?.additionalProperties &&
    formData &&
    typeof formData === "object" &&
    !Array.isArray(formData)
  ) {
    return _.mapValues(formData, (value, key) => {
      const propSchema = getSchemaBySchemaPath(schema, `additionalProperties`);
      return filterFormDataBySchema(value, propSchema);
    });
  }
  if (schema.$ref && formData) {
    const propSchema = getSchemaByRef(schema, schema.$ref);
    return filterFormDataBySchema(formData, propSchema);
  }
  return formData;
};

export const calcUiSchema = (
  originSchema: SemixJsonSchema,
  hasDynamicSchema: boolean,
  context,
  formData,
  getCustomWidget,
) => {
  let resultSchema = originSchema;
  if (hasDynamicSchema) {
    resultSchema = calcDynamicSchema(resultSchema, context, formData);
  }
  return semixifySchema(resultSchema, getCustomWidget);
};
