import * as PontSpec from "pontx-spec";
import * as _ from "lodash";
import { TypeScriptGenerator } from "../../language";
import { indentation } from "../../utils";

export const getSseType = (produceType: string) => {
  let sseType = "";
  if (produceType === "application/octet-stream") {
    sseType = "OctetStream";
  } else if (produceType === "text/event-stream") {
    sseType = "EventStream";
  }

  return sseType;
};

export const specDTs = (spec: PontSpec.PontSpec, options = new SpecTsOptions()) => {
  const hasMods = PontSpec.PontSpec.checkHasMods(spec);
  const mods = PontSpec.PontSpec.getMods(spec);
  const prefixCode =
    [
      `import type { API, defs } from './type.d.ts';`,
      `import { provider } from './request';`,
      ``,
      `type SDKMethods2<Method, Response> = ReturnType<typeof provider.getSDKMethods<Method, Response>>;`,
      `type SDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getSDKMethods<Method, Params, Response>>;`,
      `type SDKMethods4<Method, Params, BodyParams, Response> = ReturnType<`,
      `  typeof provider.getSDKMethods<Method, Params, BodyParams, Response>`,
      `>;`,
      ``,
      `type OctetStreamSDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getOctetStreamSDKMethods<Method, Params, Response>>;`,
      `type OctetStreamSDKMethods4<Method, Params, BodyParams, Response> = ReturnType<`,
      `  typeof provider.getOctetStreamSDKMethods<Method, Params, BodyParams, Response>`,
      `>;`,
      ``,
      `type EventStreamSDKMethods2<Method, Response> = ReturnType<typeof provider.getEventStreamSDKMethods<Method, Response>>;`,
      `type EventStreamSDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getEventStreamSDKMethods<Method, Params, Response>>;`,
      `type EventStreamSDKMethods4<Method, Params, BodyParams, Response> = ReturnType<`,
      `  typeof provider.getEventStreamSDKMethods<Method, Params, BodyParams, Response>`,
      `>;`,
    ].join("\n") + "\n\n";

  if (hasMods) {
    return (
      prefixCode +
      [
        `export namespace APIs {`,
        _.map(mods, (controller) => {
          const controllerComment = controller?.description ? `/** ${controller.description} */\n` : "";

          const controllerCode = [
            `export namespace ${controller.name} {`,
            _.map(controller.interfaces, (api, name) => {
              const apiCommentCode = TypeScriptGenerator.apiComment(api);
              const prefix = `API.${controller.name}.${api.name}`;
              const produceType = (api.produces || [])[0];

              const hasParams = (api.parameters || []).some((param) => param.in !== "body");
              const hasBody = (api.parameters || []).some((param) => param.in === "body");
              const template =
                "<\n" +
                [
                  `  ${prefix}.method`,
                  hasParams ? `  ${prefix}.Params` : "",
                  hasBody ? `  ${prefix}.bodyParams` : "",
                  `  ${prefix}.APIResponse`,
                ]
                  .filter((id) => id)
                  .join(",\n") +
                "\n>";
              let templateCnt = 2 + (hasBody ? 1 : 0) + (hasParams ? 1 : 0);

              const typeCode = `${getSseType(produceType)}SDKMethods${templateCnt}${template};`;
              const apiTsCode = `export const ${api.name}: ${typeCode}`;
              return indentation(2)(apiCommentCode + apiTsCode);
            }).join("\n\n"),
            `}`,
          ].join("\n");

          return indentation(2)(controllerComment + controllerCode);
        }).join("\n\n"),
        `}`,
      ].join("\n")
    );
  }

  return (
    prefixCode +
    [
      `export namespace APIs {`,
      _.map(spec.apis, (api, name) => {
        const apiCommentCode = TypeScriptGenerator.apiComment(api);
        const prefix = `API.${name}`;
        const produceType = (api.produces || [])[0];

        const hasParams = (api.parameters || []).some((param) => param.in !== "body");
        const hasBody = (api.parameters || []).some((param) => param.in === "body");
        const template =
          "<\n" +
          [
            `  ${prefix}.method`,
            hasParams ? `  ${prefix}.Params` : "",
            hasBody ? `  ${prefix}.bodyParams` : "",
            `  ${prefix}.APIResponse`,
          ]
            .filter((id) => id)
            .join(",\n") +
          "\n>";
        let templateCnt = 2 + (hasBody ? 1 : 0) + (hasParams ? 1 : 0);
        const typeCode = `${getSseType(produceType)}SDKMethods${templateCnt}${template};`;

        const apiTsCode = `export const ${api.name}: ${typeCode}`;
        const apiContentTsCode = indentation(2)(apiCommentCode + apiTsCode);
        return apiContentTsCode;
      }).join("\n\n"),
      `}`,
    ].join("\n")
  );
};

export class SpecTsOptions {
  multiple: boolean = true;
  apiProviderName = "HttpApiMethodsProvider";
  apiProviderImport = 'import { HttpApiMethodsProvider } from "pontx-sdk-core";';

  constructor(options = {} as any) {
    if (options.sdkType === "react-hooks") {
      this.apiProviderName = "ReactHooksApiMethodsProvider";
      this.apiProviderImport = `import { ${this.apiProviderName} } from "pontx-sdk-core/lib/providers/react-hooks";`;
    } else if (options.sdkType === "nodejs") {
      this.apiProviderName = "NodejsApiMethodsProvider";
      this.apiProviderImport = `import { NodejsApiMethodsProvider } from "pontx-sdk-core/commonjs/providers/nodejs";`;
    } else {
      this.apiProviderName = options?.apiProviderName || "HttpApiMethodsProvider";
      this.apiProviderImport = options?.apiProviderImport || `import { HttpApiMethodsProvider } from "pontx-sdk-core";`;
    }

    if (Object.prototype.hasOwnProperty.call(options, "multiple")) {
      this.multiple = options.multiple;
    }
  }
}

export const specJs = (spec: PontSpec.PontSpec, options = new SpecTsOptions()) => {
  return `import specJSON from './meta.json';
import { apiSDK } from './apiSDK';
import { createSDKClient } from 'pontx-sdk-core';

export const APIs = createSDKClient(specJSON, apiSDK);
`;
};

export const apiRequestTs = (options = new SpecTsOptions()) => `${options.apiProviderImport}
${options?.multiple ? `import { rootDefaults } from "../defaults";` : ""}
import type { APIs as APIsType } from "./spec.d.ts";
import { createSDKClient, getSDKOptionsFormSpecJSON } from "pontx-sdk-core";
import specJSON from "./meta";

export const provider = new ${options.apiProviderName}();

export { ${options.apiProviderName}, specJSON };

export type DefaultsType = typeof provider.defaults & { pontxRequester?: typeof provider.pontxRequester };

export const setDefaults = (options = {} as DefaultsType) => {
  const finalOptions = {${options?.multiple ? `\n	...rootDefaults,` : ""}
    ...options,
  };
  const { pontxRequester, ...defaults } = finalOptions;

  provider.setDefaults(defaults);

  if (pontxRequester) {
    provider.pontxRequester = pontxRequester;
  }
};

export const APIs = createSDKClient<typeof APIsType>(specJSON as any, provider);

export const createSDK = (options = {} as DefaultsType) => {
	const specOptions = getSDKOptionsFormSpecJSON(specJSON as any);
	const sdkProvider = new ${options.apiProviderName}({ ...specOptions, ...options});
	return createSDKClient<typeof APIsType>(specJSON as any, sdkProvider);
}
`;
