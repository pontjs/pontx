export class BaseClazzDiffOp {
  static getFields(fields: string[]) {
    return (fields || [])
      .map((field, fieldIndex) => {
        if (fieldIndex !== fields?.length - 1 && field !== "[*]") {
          return field + ".";
        }
        return field;
      })
      .join("");
  }

  static getSchemaDiffItems(
    diffResult,
    fields: string[],
  ): {
    localValue: any;
    remoteValue: any;
    fields: string[];
    type: string;
  } {
    const { paths, type, localValue, remoteValue } = diffResult;
    const [fieldName, ...rest] = paths;

    if (!paths?.length) {
      return {
        localValue,
        remoteValue,
        fields,
        type,
      };
    }

    switch (fieldName) {
      case "items": {
        return BaseClazzDiffOp.getSchemaDiffItems(
          {
            paths: rest,
            type,
            localValue,
            remoteValue,
          },
          [...fields, "[*]"],
        );
      }
      case "properties": {
        const [prop, ...others] = rest;

        return BaseClazzDiffOp.getSchemaDiffItems(
          {
            paths: others,
            type,
            localValue,
            remoteValue,
          },
          [...fields, prop],
        );
      }
      case "additionalProperties": {
        return BaseClazzDiffOp.getSchemaDiffItems(
          {
            paths: rest,
            type,
            localValue,
            remoteValue,
          },
          [...fields, "[*]"],
        );
      }
    }
  }
}
