import { PontxGenericTypeParameter, PontxJsonSchema } from "./schema";
import _ from "lodash";

export class GenericHelper {
  /** 替换泛型类型参数 */
  static replaceGenericTypeParameter(
    genericClassSchema: PontxJsonSchema,
    genericTypeParam: PontxGenericTypeParameter,
    genericTypeParameterValue: PontxJsonSchema
  ) {
    const genericTypeName =
      typeof genericTypeParam === "string"
        ? genericTypeParam
        : genericTypeParam.name;
    const genericTypeValue =
      typeof genericTypeParam === "string"
        ? genericTypeParameterValue
        : genericTypeParameterValue || genericTypeParam.default;

    return PontxJsonSchema.mapPontxSchema(genericClassSchema, (struct) => {
      if (
        struct.type === "generic" &&
        struct.genericTypeParameterRef === genericTypeName
      ) {
        return genericTypeValue;
      }
      return struct;
    });
  }

  static lazyResolveGenericSchema(genericSchema: PontxJsonSchema) {
    return PontxJsonSchema.mapPontxSchema(
      genericSchema,
      (struct) => {
        if (struct?.type === "generic" && struct?.genericRef?.$ref) {
          return {
            ...struct,
            $ref: struct.genericRef.$ref,
          };
        }
        return struct;
      },
      false
    );
  }

  /** 解析泛型类型 */
  static _resolveTargetGenericSchema(
    genericSchema: PontxJsonSchema,
    schemas: Record<string, PontxJsonSchema>
  ) {
    if (genericSchema?.type === "generic" && genericSchema?.genericRef?.$ref) {
      const refName = genericSchema?.genericRef?.$ref?.split("/").pop();
      const genericTypeArguments = genericSchema?.genericRef?.typeArguments;
      let resultSchema = _.cloneDeep(schemas[refName]) as PontxJsonSchema & {
        genericTypeArguments?: PontxJsonSchema[];
      };

      if (resultSchema?.genericTypeParameters?.length) {
        resultSchema.genericTypeParameters.forEach((param, index) => {
          resultSchema = GenericHelper.replaceGenericTypeParameter(
            resultSchema,
            param,
            genericTypeArguments[index]
          );
        });
        resultSchema.genericTypeArguments = genericTypeArguments;
      }

      if (resultSchema) {
        return GenericHelper.lazyResolveGenericSchema(resultSchema);
      }

      return resultSchema || genericSchema;
    }

    return genericSchema;
  }

  static resolveGenericSchema(
    genericSchema: PontxJsonSchema,
    schemas: Record<string, PontxJsonSchema>
  ) {
    return PontxJsonSchema.mapPontxSchema(
      genericSchema,
      (struct) => {
        return GenericHelper._resolveTargetGenericSchema(struct, schemas);
      },
      false
    );
  }
}
