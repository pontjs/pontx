import * as PontSpec from "pontx-spec";
import { OAS2, OAS3 } from "oas-spec-ts";
import { parse } from "url";
import {
  getIdentifierFromOperatorId,
  getIdentifierFromUrl,
  getMaxSamePath,
  processDuplicateInterfaceName,
  toDashCase,
  JsonSchemaContext,
  deleteDuplicateBaseClass,
  processTag,
  processDuplicateNameSpaceName,
  transformCamelCase,
  hasChinese,
} from "./utils";
import * as _ from "lodash";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { parseJsonSchema } from "./schema";
import { Translate } from "pontx-manager/src/translator";

export function parseOAS3Interface(
  inter: OAS3.OperationObject & { path: string; method: string },
  context = new JsonSchemaContext(),
) {
  const { samePath } = context;
  const { path, method } = inter;
  let name = "";

  if (!inter.operationId) {
    name = getIdentifierFromUrl(path, method, samePath);
  } else {
    name = getIdentifierFromOperatorId(inter.operationId);
  }

  const responses = _.mapValues(inter.responses, (response) => {
    const { content, headers, description, ...rest } = response || {};
    const onlyKey = Object.keys(content || {})[0];
    const schema = content?.[onlyKey]?.schema;
    const responseSchema = schema ? parseJsonSchema(schema, context) : new PontSpec.PontJsonSchema();

    return { ...rest, schema: responseSchema, headers: headers as any };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const { required, name, schema, ...rest } = param;
    const paramSchema = { ...rest, ...(schema || {}) };

    return {
      in: param.in as any,
      name: name.includes("/") ? name.split("/").join("") : name,
      required,
      schema: parseJsonSchema(paramSchema as any as OAS3.SchemaObject, { ...context, required }),
    } as PontSpec.Parameter;
  });
  let consumes = [];
  if (inter.requestBody) {
    const consume = Object.keys(inter.requestBody.content)[0];
    if (consume) {
      const stardardConsume = consume?.split(";")?.[0] || consume;
      consumes = [stardardConsume];
      const bodyParma = {
        name: "body",
        in: "body" as any,
        required: true,
        schema: parseJsonSchema(inter.requestBody.content[consume]?.schema, context),
      };
      parameters.push(bodyParma);
    }
  }

  const pontAPI = {
    summary: inter.summary,
    consumes,
    // consumes: inter.consumes,
    description: inter.description,
    name,
    method,
    path,
    responses,
    deprecated: inter.deprecated,
    /** 后端返回的参数可能重复 */
    parameters: _.unionBy(parameters, "name"),
  } as PontSpec.PontAPI;

  return pontAPI;
}

export async function parseSwagger2APIs(swagger: OAS3.OpenAPIObject, defNames: string[], translator: Translate) {
  const tags = [
    ...(swagger.tags || []),
    {
      name: "common",
      description: "common",
    },
  ] as OAS2.TagObject[];
  const allSwaggerInterfaces = [] as Array<OAS3.OperationObject & { path: string; method: string }>;

  Object.keys(swagger.paths).forEach((path) => {
    const methodInters = swagger.paths[path];

    // methodInters.parameters

    const methods = ["get", "delete", "put", "post", "patch", "options", "head"];
    methods.forEach((method) => {
      const inter = methodInters[method] as OAS3.OperationObject;
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

  const directories = tags
    .map((tag) => {
      const tagInterfaces = allSwaggerInterfaces.filter((inter) => {
        tag.description = tag.description || "";

        return (
          inter.tags.includes(tag.name) ||
          inter.tags.includes(tag.name.toLowerCase()) ||
          inter.tags.includes(tag.description.toLowerCase()) ||
          inter.tags.includes(toDashCase(tag.description))
        );
      });
      const samePath = getMaxSamePath(tagInterfaces.map((inter) => inter.path.slice(1)));

      const standardInterfaces = tagInterfaces.map((inter) => {
        return parseOAS3Interface(inter, {
          defNames,
          samePath,
          classTemplateArgs: [],
        });
      });
      processDuplicateInterfaceName(standardInterfaces, samePath);
      const processedTag = processTag(tag);

      return {
        ...processedTag,
        interfaces: standardInterfaces,
      };
    })
    .filter((tag) => {
      return tag.interfaces.length;
    });
  const apis = directories.reduce((result: PontSpec.ObjectMap<PontSpec.PontAPI>, dir) => {
    return dir.interfaces.reduce((currResult, api) => {
      return {
        ...currResult,
        [`${dir.namespace}/${api.name}`]: api,
      };
    }, result as PontSpec.ObjectMap<PontSpec.PontAPI>);
  }, {} as any);

  processDuplicateNameSpaceName(directories);

  const retDirs = _.sortBy(directories, (dir) => dir.namespace).map((dir) => {
    const { interfaces, ...rest } = dir;
    return {
      ...rest,
      children: interfaces.map((api) => `${dir.namespace}/${api.name}`),
    };
  });
  return {
    directories: retDirs,
    apis,
  };
}

export async function parseOAS3(
  swagger: OAS3.OpenAPIObject,
  name: string,
  translator: Translate,
  originUrl?: string,
): Promise<PontSpec.PontSpec> {
  const draftClasses = _.map(swagger?.components?.schemas || {}, (schema: any, defName) => {
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
    });
    const { definitions, required, properties, additionalProperties, items, ...rest } = clazz.schema;
    const clazzSchema = {
      ...rest,
      requiredProps: required,
      typeName: dataType.typeName,
      templateArgs: dataType.templateArgs,
    } as PontSpec.PontJsonSchema;
    if (properties) {
      clazzSchema.properties = _.mapValues(clazz.schema?.properties || {}, (value, key) => {
        return parseJsonSchema(value, {
          classTemplateArgs: dataType.templateArgs,
          required: required?.includes(key),
          defNames,
        });
      });
    }
    if (additionalProperties) {
      clazzSchema.additionalProperties = parseJsonSchema(additionalProperties, {
        classTemplateArgs: dataType.templateArgs,
        defNames,
      });
    }
    if (items) {
      clazzSchema.items = parseJsonSchema(items, {
        classTemplateArgs: dataType.templateArgs,
        defNames,
      });
    }

    return {
      schema: clazzSchema,
      name: clazz.name,
    };
  });
  baseClasses = deleteDuplicateBaseClass(baseClasses);
  const { apis, directories } = await parseSwagger2APIs(swagger, defNames, translator);

  let host, basePath;
  const server = (swagger.servers || [])?.[0];

  if (server?.url) {
    const url = parse(server.url || "");
    host = url?.hostname;
    basePath = url?.pathname;

    if (!host && originUrl) {
      host = parse(originUrl)?.hostname;
    }
  }

  const pontDs = {
    definitions: baseClasses.reduce((result, base) => {
      return {
        ...result,
        [base.name]: base.schema,
      };
    }, {}),
    apis,
    directories,
    name,
    basePath,
    description: swagger?.info?.description || swagger?.info?.title || "",
    host,
    ext: {},
  } as PontSpec.PontSpec;

  try {
    const metaStr = JSON.stringify(pontDs);

    return JSON.parse(metaStr);
  } catch (e) {
    return pontDs;
  }
}
