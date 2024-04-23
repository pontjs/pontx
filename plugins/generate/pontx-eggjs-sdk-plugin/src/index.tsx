import {
  ControllerSnippetsProvider,
  GetFilesBySpecs,
  TypeScriptGenerator,
  getFilesBySpecs,
  getRootFiles,
	JavaScriptGenerator,
  snippetsProvider,
} from "pontx-generate";
import { createPontxGeneratePlugin, SnippetsProvider, PontxGeneratorPlugin } from "pontx-generate";
import * as _ from "lodash";
import * as PontxSpec from "pontx-spec";
import { PontManager } from "pontx-manager";
import { specInterfaceDts, toUpperCamelCase } from "./template/specInterfaceDts";
import { specIndexDTsWithoutController } from "./template/specIndexDTsWithoutController";
import { specIndexDTsWithController } from "./template/specIndexDTsWithController";


const rootIndexDTS = (specNames: string[]) => `import * as API from "./api";
import * as defs from "./defs";

${specNames
  .map((name) => {
    return `export { Services as ${toUpperCamelCase(name)}Services } from "./${name}/spec";`;
  })
  .join("\n")}

export { API, defs };
`;

const myGetFilesBySpecs: GetFilesBySpecs = async (origins) => {
  const specDirs = _.map(origins, (origin) => {
    const spec = origin.spec;
    const withoutControllers = PontxSpec.PontSpec.getMods(spec)?.[0]?.name === PontxSpec.WithoutModsName;
    const specDts = withoutControllers ? specIndexDTsWithoutController(spec) : specIndexDTsWithController(spec);

    return {
      [spec.name]: {
        "type.d.ts": specDts,
        "spec.d.ts": specInterfaceDts(spec),
        [PontManager.lockFilename]: JSON.stringify(spec, null, 2),
      },
    };
  }).reduce((pre, curr) => {
    return {
      ...pre,
      ...curr,
    };
  }, {});
  const rootFiles = getRootFiles(origins);
  const indexDTS = rootIndexDTS(origins.map((origin) => origin.spec.name));

  return {
    ...specDirs,
    ["api.d.ts"]: rootFiles?.["api.d.ts"] || "",
    ["defs.d.ts"]: rootFiles?.["defs.d.ts"] || "",
    ["index.d.ts"]: indexDTS,
  };
};

const mySnippetsProvider: SnippetsProvider = (info) => {
  const upperOriginName = toUpperCamelCase(info.originName);
  const responseCode = TypeScriptGenerator.generateSchemaCode(info?.api.responses["200"]?.schema);
  const assignModule = info.controllerName ? `.${info.controllerName}` : "";

  const code = [
    `  async ${info?.api.name}(request: API${assignModule}.${info?.api.name}.Request, options: RequestOptions): Promise<${responseCode}> {`,
    `    // write your code here`,
    `    return null;`,
    `  }`,
  ].join("\n");

  const snippets = [
    {
      name: "Eggjs Service API Snippet",
      code,
    },
  ];
  return snippets;
};

const myControllerSnippetsProvider: ControllerSnippetsProvider = (info) => {
  const upperOriginName = toUpperCamelCase(info.originName);
  const upperServiceName = toUpperCamelCase(info.controllerName);
  const assignModule = info.controllerName ? `.${info.controllerName}` : "";
  const template = `import { ${upperOriginName}Services } from '../pontx/sdk';
import { RequestOptions } from '../pontx/sdk/${info.originName}/spec';
import { API, defs } from '../pontx/sdk/${info.originName}/type';
import { Service } from 'egg';

export default class ${upperServiceName}Service extends Service implements ${upperOriginName}Services.${upperServiceName}Service {
	${info.controller?.interfaces
    ?.map((api) => {
      const responseCode = TypeScriptGenerator.generateSchemaCode(api.responses['200']?.schema);

      return [
        `  async ${api.name}(request: API${assignModule}.${api.name}.Request, options?: RequestOptions): Promise<${responseCode}> {`,
        `    // write your code here`,
        `    return ${JavaScriptGenerator.getSchemaInitValue(api.responses['200']?.schema)} as any;`,
        `  }`,
      ].join("\n");
    })
    .join("\n\n")}
}
`;

  const snippets = [
    {
      name: "Eggjs Service Snippet",
      code: template,
    },
  ];

  return snippets;
};

export const reactHooksGeneratePlugin: any = createPontxGeneratePlugin({
  snippetsProvider: mySnippetsProvider,
  getFilesBySpecs: myGetFilesBySpecs,
  controllerSnippetsProvider: myControllerSnippetsProvider,
});

export default reactHooksGeneratePlugin;
export { getFilesBySpecs, snippetsProvider };
