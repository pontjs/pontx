import * as PontSpec from "pont-spec";
import { OAS2 } from "oas-spec-ts";
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
} from "./utils";
import * as _ from "lodash";
import { compileTemplate, parseAst2PontJsonSchema } from "./compiler";
import { parseJsonSchema } from "./schema";

export function parseOAS2Interface(
  inter: OAS2.OperationObject & { path: string; method: string },
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
    const responseSchema = response.schema ? parseJsonSchema(response.schema, context) : new PontSpec.PontJsonSchema();
    return { ...response, schema: responseSchema };
  });

  const parameters = (inter.parameters || []).map((param) => {
    const { required, name, schema, ...rest } = param;
    const paramSchema = { ...rest, ...(schema || {}) };

    return {
      in: param.in as any,
      name: name.includes("/") ? name.split("/").join("") : name,
      required,
      schema: parseJsonSchema(paramSchema as any as OAS2.SchemaObject, { ...context, required }),
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

  const pontAPI = {
    consumes: inter.consumes,
    description: interDesc,
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

export function parseSwagger2APIs(swagger: OAS2.SwaggerObject, defNames: string[]) {
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
        return parseOAS2Interface(inter, {
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

export function parseOAS2(swagger: OAS2.SwaggerObject, name = ""): PontSpec.PontSpec {
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
  const { apis, directories } = parseSwagger2APIs(swagger, defNames);

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
  } as PontSpec.PontSpec;

  try {
    const metaStr = JSON.stringify(pontDs);

    return JSON.parse(metaStr);
  } catch (e) {
    return pontDs;
  }
}
