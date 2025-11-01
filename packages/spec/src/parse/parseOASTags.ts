import { OAS2, OAS3 } from "oas-spec-ts";
import {
  checkHasNonVarialbeCh,
  hasChinese,
  toDashCase,
  transformTagName,
  lowerFirstLetter,
} from "./utils.js";
import _ from "lodash";

const { uniqueId } = _;

export function fixOASTags<
  Swagger extends OAS2.SwaggerObject | OAS3.OpenAPIObject
>(swagger: Swagger): Swagger {
  // 有些 Spec，虽然 swagger.tags 为空，但是存在 API 里的 tags 字段
  // if (!swagger?.tags?.length) {
  //   if (swagger) {
  //     return { ...swagger, tags: [{ name: "common" }] };
  //   }
  //   return swagger;
  // }

  const tagItems = (swagger.tags || [])
    .map((tag) => {
      return {
        tagNameLikes: _.union(
          [tag.name || "", tag.description || ""].filter((id) => id)
        ),
      };
    })
    .concat({
      tagNameLikes: ["common"],
    });

  const processedTagItems = tagItems.map((tag) => {
    return {
      ...tag,
      tagNameDashedLikes: tag.tagNameLikes.map((name) => toDashCase(name)),
      tagNameLowerLikes: tag.tagNameLikes.map((name) => name.toLowerCase()),
      uuid: uniqueId("tag-"),
    };
  });

  if (!swagger.paths) {
    return {
      ...swagger,
      tags: [],
    };
  }

  const apiTagLinks = new Map<string, { method: string; path: string }[]>();

  const addApiTagLink = (uuid: string, method: string, path: string) => {
    if (apiTagLinks.has(uuid)) {
      apiTagLinks.get(uuid).push({ method, path });
    } else {
      apiTagLinks.set(uuid, [{ method, path }]);
    }
  };

  const validTagNames = new Set<string>();

  Object.keys(swagger.paths || {}).forEach((path) => {
    const methodInters = swagger.paths[path];
    Object.keys(methodInters).forEach((method) => {
      const inter = methodInters[method] as
        | OAS2.OperationObject
        | OAS3.OperationObject;

      if (!inter) {
        return;
      }

      if (
        ![
          "get",
          "post",
          "put",
          "delete",
          "patch",
          "options",
          "head",
          "trace",
        ].includes(method?.toLowerCase())
      ) {
        return;
      }

      if (inter.tags) {
        inter.tags.forEach((tag) => {
          const tagItem = processedTagItems.find((item) => {
            return item.tagNameLikes.includes(tag);
          });

          if (tagItem) {
            addApiTagLink(tagItem.uuid, method, path);
            return;
          }
          const dashedTag = toDashCase(tag);
          const dashedTagItem = processedTagItems.find((item) => {
            return item.tagNameDashedLikes.includes(dashedTag);
          });

          if (dashedTagItem) {
            addApiTagLink(dashedTagItem.uuid, method, path);
            return;
          }

          const lowerTag = tag.toLowerCase();
          const lowerTagItem = processedTagItems.find((item) => {
            return item.tagNameLowerLikes.includes(lowerTag);
          });

          if (lowerTagItem) {
            addApiTagLink(lowerTagItem.uuid, method, path);
            return;
          }

          if (tag) {
            // 存在 API 的 tag，没有被定义在 tags 中。
            const newTag = {
              tagNameLikes: [tag],
              tagNameDashedLikes: [],
              tagNameLowerLikes: [],
              uuid: uniqueId("tag-"),
            };
            processedTagItems.push(newTag);
            addApiTagLink(newTag.uuid, method, path);
          }
        });
      } else {
        const commonTagItem = processedTagItems.find((item) => {
          return item.tagNameLikes.includes("common");
        });

        if (commonTagItem) {
          addApiTagLink(commonTagItem.uuid, method, path);
        }
      }
    });
  });

  const validTagItems = processedTagItems.filter((tagItem) =>
    apiTagLinks.has(tagItem.uuid)
  );

  const tags = validTagItems.map((tagItem) => {
    let [name, description] = tagItem.tagNameLikes;

    if (
      description &&
      name &&
      checkHasNonVarialbeCh(name) &&
      !checkHasNonVarialbeCh(description)
    ) {
      [name, description] = [description, name];
    }

    if (name && hasChinese(name) && description && !hasChinese(description)) {
      [name, description] = [description, name];
    }

    return {
      name: name && !hasChinese(name) ? transformTagName(name) : name,
      description,
      uuid: tagItem.uuid,
    };
  });

  const getTagsByApi = (method: string, path: string) => {
    const foundTags = [];
    Array.from(apiTagLinks.keys()).forEach((linkUuid) => {
      const apis = apiTagLinks.get(linkUuid);
      if (apis?.some((api) => api.method === method && api.path === path)) {
        const tagItem = tags.find((tag) => tag.uuid === linkUuid);
        foundTags.push(tagItem.name);
      }
    });
    return foundTags;
  };

  const paths = _.mapValues(swagger.paths, (methodInter, path) => {
    return _.mapValues(methodInter, (inter, method) => {
      if (typeof inter === "string") {
        return inter;
      }

      if (Array.isArray(inter)) {
        return inter;
      }

      const tags = getTagsByApi(method, path);
      return {
        ...inter,
        tags,
      };
    });
  }) as OAS2.PathsObject | OAS3.PathsObject;

  return {
    ...swagger,
    tags: tags.map((tag) => {
      return {
        name: tag.name,
        description: tag.description,
      } as OAS2.TagObject | OAS3.TagObject;
    }),
    paths,
  };
}

export async function translateOASTags(
  tags: OAS2.TagObject[] | OAS3.TagObject[],
  translate: (text: string) => Promise<string>
) {
  const promises = tags.map(async (tag: OAS2.TagObject | OAS3.TagObject) => {
    if (
      tag?.name &&
      hasChinese(tag.name) &&
      (hasChinese(tag.description) ||
        !tag.description?.trim?.() ||
        tag.description === tag.name)
    ) {
      try {
        let newTagName = await translate(tag.name);
        newTagName = _.startCase(newTagName).split(" ").join("");

        return {
          name: newTagName,
          description: tag.name,
        };
      } catch (e) {
        return tag;
      }
    }
    return tag;
  });

  const results = await Promise.all(promises);

  return results;
}

export async function fixOASTagsByTranslate(
  swagger: OAS2.SwaggerObject | OAS3.OpenAPIObject,
  translate: (text: string) => Promise<string>
) {
  const fixedSwagger = fixOASTags(swagger);

  const translatedTags = await translateOASTags(fixedSwagger.tags, translate);
  const tagNameReplaceMap = new Map<string, string>();
  translatedTags.forEach((tag, index) => {
    if (tag.name !== fixedSwagger.tags[index].name) {
      tagNameReplaceMap.set(fixedSwagger.tags[index].name, tag.name);
    }
  });

  const paths = _.mapValues(fixedSwagger.paths, (methodInter, path) => {
    return _.mapValues(methodInter, (inter, method) => {
      if (typeof inter === "string") {
        return inter;
      }

      if (Array.isArray(inter)) {
        return inter;
      }

      return {
        ...inter,
        tags: inter.tags.map((tag) => tagNameReplaceMap.get(tag) || tag),
      };
    });
  });

  return {
    ...fixedSwagger,
    tags: translatedTags,
    paths,
  };
}
