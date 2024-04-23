import { PontSpec } from "pontx-spec";

const baseKeyword = "AI 辅助，大模型, Pontx";
const baseTitle = "Pontx";
export function getMetaDataFromSpec(spec: PontSpec, projectName: string, query) {
  const projectTitle = spec?.title || projectName;
  const projectDescription = spec?.description;
  const apiName = query?.api;
  const structName = query?.struct;
  let metaTitle = "";
  let metaDescription = "";

  if (apiName) {
    metaTitle = spec?.apis?.[apiName]?.title || apiName;
    metaDescription = spec?.apis?.[apiName]?.description || spec?.apis?.[apiName]?.summary || apiName;
  } else if (structName) {
    metaTitle = spec?.definitions?.[structName]?.title || structName;
    metaDescription = spec?.definitions?.[structName]?.description || structName;
  }

  let lifeCycle = "";
  let lifeCycleDescription = "";

  lifeCycle = "OpenAPI 文档";
  lifeCycleDescription = "OpenAPI 文档";

  const title = [baseTitle, lifeCycle, projectTitle, metaTitle].filter((id) => id).join(" - ");
  const description = [baseTitle, lifeCycleDescription, projectDescription, metaDescription]
    .filter((id) => id)
    .join(", ");
  const keywords = [baseKeyword, projectTitle, metaTitle].filter((id) => id).join(", ");

  return {
    title,
    description,
    keywords,
  };
}
