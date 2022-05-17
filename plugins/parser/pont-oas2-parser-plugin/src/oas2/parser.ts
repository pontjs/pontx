import * as PontSpec from "pont-spec";
import { OAS2 } from "oas-spec-ts";
import {
  getIdentifierFromOperatorId,
  getIdentifierFromUrl,
  getMaxSamePath,
  processDuplicateInterfaceName,
  processMod,
  processDuplicateModName,
  toDashCase,
  JsonSchemaContext,
  deleteDuplicateBaseClass,
} from "./utils";
import * as _ from "lodash";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { parseJsonSchema } from "./schema";

export function parseOAS2Interface(
  inter: OAS2.OperationObject & { path: string; method: string },
  context = new JsonSchemaContext(),
) {
  const { samePath, defNames = [], compileTemplateKeyword } = context;
  const { path, method } = inter;
  let name = "";

  if (!inter.operationId) {
    name = getIdentifierFromUrl(path, method, samePath);
  } else {
    name = getIdentifierFromOperatorId(inter.operationId);
  }

  const responses = _.mapValues(inter.responses, (response) => {
    const responseSchema = response.schema ? parseJsonSchema(response.schema, context) : new PontSpec.PontJsonSchema();
    return { ...response, schema: responseSchema };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const { name, required, schema, ...rest } = param;
    const paramSchema = { ...rest, ...(schema || {}) };

    return {
      in: param.in as any,
      name: name.includes("/") ? name.split("/").join("") : name,
      schema: parseJsonSchema(paramSchema as any as OAS2.SchemaObject, context),
      required,
    } as PontSpec.Parameter;
  });

  let interDesc = inter.summary;

  if (inter.description) {
    if (interDesc) {
      interDesc += "\n" + inter.description;
    } else {
      interDesc = inter.description;
    }
  }

  const standardInterface = {
    consumes: inter.consumes,
    description: interDesc,
    name,
    method,
    path,
    responses,
    deprecated: inter.deprecated,
    /** 后端返回的参数可能重复 */
    parameters: _.unionBy(parameters, "name"),
  } as PontSpec.Interface;

  return standardInterface;
}

export function parseSwagger2Mods(swagger: OAS2.SwaggerObject, defNames: string[], compileTemplateKeyword?: string) {
  const tags = [
    ...(swagger.tags || []),
    {
      name: "common",
      description: "common",
    },
  ] as OAS2.TagObject[];
  const allSwaggerInterfaces = [] as Array<OAS2.OperationObject & { path: string; method: string }>;

  Object.keys(swagger.paths).forEach((path) => {
    const methodInters = swagger.paths[path];

    // methodInters.parameters

    const methods = ["put", "get", "delete", "patch", "post", "options", "head"];
    methods.forEach((method) => {
      const inter = methodInters[method] as OAS2.OperationObject;
      if (!inter) {
        return;
      }
      allSwaggerInterfaces.push({
        ...inter,
        path,
        method,
        tags: inter.tags || ["common"],
        parameters: _.unionBy(inter.parameters, methodInters.parameters || [], "name"),
      });
    });
  });

  const mods = tags
    .map((tag) => {
      const modInterfaces = allSwaggerInterfaces.filter((inter) => {
        tag.description = tag.description || "";

        return (
          inter.tags.includes(tag.name) ||
          inter.tags.includes(tag.name.toLowerCase()) ||
          inter.tags.includes(tag.description.toLowerCase()) ||
          inter.tags.includes(toDashCase(tag.description))
        );
      });

      const samePath = getMaxSamePath(modInterfaces.map((inter) => inter.path.slice(1)));

      const standardInterfaces = modInterfaces.map((inter) => {
        return parseOAS2Interface(inter, {
          defNames,
          samePath,
          classTemplateArgs: [],
          compileTemplateKeyword,
        });
      });
      processDuplicateInterfaceName(standardInterfaces, samePath);

      const processedMod = processMod(standardInterfaces, tag);
      return {
        ...processedMod,
        interfaces: _.sortBy(processedMod.interfaces, (api) => api.name),
      };
    })
    .filter((mod) => {
      return mod.interfaces.length;
    });

  processDuplicateModName(mods);

  return _.sortBy(mods, (mod) => mod.name);
}

export function parseOAS2(swagger: OAS2.SwaggerObject, name = ""): PontSpec.PontSpec {
  const compileTemplateKeyword = "#/definitions/";
  const draftClasses = _.map(swagger.definitions, (schema, defName) => {
    const defNameAst = compileTemplate(defName);

    if (!defNameAst) {
      throw new Error("compiler error in defname: " + defName);
    }

    return {
      name: defNameAst.name,
      defNameAst,
      schema,
    };
  });
  const defNames = draftClasses.map((clazz) => clazz.name);

  let baseClasses = draftClasses.map((clazz) => {
    const dataType = parseAst2PontJsonSchema(clazz.defNameAst, {
      classTemplateArgs: [],
      defNames,
      compileTemplateKeyword: "#/definitions/",
    });
    const clazzSchema = {
      ...clazz.schema,
      typeName: dataType.typeName,
      templateArgs: dataType.templateArgs,
      properties: _.mapValues(clazz.schema?.properties || {}, (value, key) => {
        return parseJsonSchema(value, {
          classTemplateArgs: dataType.templateArgs,
          compileTemplateKeyword,
          defNames,
        });
      }),
    };

    return {
      schema: clazzSchema,
      name: clazz.name,
    } as PontSpec.BaseClass;
  });
  baseClasses = deleteDuplicateBaseClass(baseClasses);

  const pontDs = {
    baseClasses,
    mods: parseSwagger2Mods(swagger, defNames, compileTemplateKeyword),
    name,
  } as PontSpec.PontSpec;

  return pontDs;
}
