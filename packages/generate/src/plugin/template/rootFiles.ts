import { InnerOriginConfig } from "pontx-manager";
import { PontSpec } from "pontx-spec";

type OriginConf = {
  spec: PontSpec;
  name: string;
  conf: InnerOriginConfig;
};

const upperCase = (word: string) => {
  if (!word) return word;

  return word[0].toUpperCase() + word.slice(1);
};

export const rootDefsTs = (origins: OriginConf[]) => {
  return (
    origins
      .map((origin) => {
        return `export type { defs as ${origin.name} } from './${origin.name}/type';`;
      })
      .join("\n") + "\n"
  );
};

export const rootAPITs = (origins: OriginConf[], SdkMethodsFn = "") => {
  return (
    origins
      .map((origin) => {
        return `export type { API as ${origin.name} } from './${origin.name}/type';`;
      })
      .join("\n") + "\n"
  );
};

export const rootIndexTs = (origins: OriginConf[]) => {
  return `import * as API from "./api";
import * as defs from "./defs";
import type { PontxSDK } from "pontx-sdk-core";

export declare const pontxSDK: PontxSDK;

${origins
  .map((origin) => {
    return `import type { APIs as ${origin.name}APIs } from "./${origin.name}/spec";`;
  })
  .join("\n")}

${origins
  .map((origin) => {
    return `export declare const ${upperCase(origin.name)}APIs: ${origin.name}APIs;`;
  })
  .join("\n")}

export declare const APIs = {
${origins.map((origin) => {
  return `  ${origin.name}: ${upperCase(origin.name)}APIs,`;
})}
};
export { API, defs };
`;
};

export const rootIndexJs = (
  origins: OriginConf[],
  pontxSDKConfigCode = `import { PontxSDK } from "pontx-sdk-core";\nexport const pontxSDK = new PontxSDK();`,
) => {
  return `/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
${pontxSDKConfigCode}

${origins
  .map((origin) => {
    return [
      `import ${origin.name}Meta from "./${origin.name}/meta.json";`,
      `export const ${upperCase(origin.name)}APIs = pontxSDK.getClient(${origin.name}Meta);`,
    ].join("\n");
  })
  .join("\n\n")}

export const APIs = {
${origins
  .map((origin) => {
    return `  ${origin.name}: ${upperCase(origin.name)}APIs,`;
  })
  .join("\n")}
};
`;
};

export const rootDocs = (origins: OriginConf[]) => {
  return `# SDK 使用指南

## Pontx SDK 简介

Pontx SDK 分为两部分

1、类型信息和元数据信息。这部分在 origin name 文件夹中。这部分代码随着 API 元数据的变化而变化。

2、构造 SDK 的部分。这部分借助类型信息和元数据信息，构造 SDK。这部分代码包括 \`api.d.ts\`, \`defs.d.ts\`, \`index.d.ts\`, \`index.js\`。这部分代码是固定不变的，也是 Pontx 默认生成的，你可以不使用这部分代码，自己构造一份定制化的 SDK。

## 使用 Pontx 默认的 SDK

你可以通过覆写 pontxSDK 的请求器，来实现一定程度的 SDK 定制。例如，你可以覆盖 API 请求的构造方式。

\`\`\`ts
pontxSDK.fetcher.fetch = (url, options) => {
	return nodeFetch(url, options);
}

pontxSDK.fetcher.getUrlPrefix = function(specMeta) {
	return 'http://your-hostname.com/api';
}

\`\`\`

## 定制自己的 SDK

Pontx 默认 SDK 无法满足你的诉求时，可以在 pontx outDir 之外，构造你自己的 SDK。
举个例子，您可以通过以下代码，借助 petstore 中的类型信息和元数据信息，构造你自己的 SDK：

\`\`\`ts
// 引用元数据
import petstoreMeta from "./petstore/meta.json";

// 引用 API 和数据结构的 TS 类型
import type { defs as PetstoreDefs } from "./petstore/type";
import type { APIs as petstoreAPIs } from "./petstore/spec";

// 构建 SDK。
import { PontxFetcher, PontxSDK } from "pontx-sdk-core";

export const pontxSDK = new PontxSDK();

// 配置定制化的请求器
pontxSDK.fetcher = new PontxFetcher();

// 生成 SDK
export const PetstoreAPIs = pontxSDK.getClient<petstoreAPIs>(petstoreMeta as any);
// 向外暴露数据结构类型
export type { PetstoreDefs };

// Sample here:
PetstoreAPIs.pet.findPetsByStatus
  .request({
    status: ["available"],
  })
  .then((res) => {
    console.log(res[0].name);
  });

const myPet: PetstoreDefs.Pet = {
  name: "my pet",
  photoUrls: ["//image.cdn.com/mypet.pnt"],
  status: "available",
};

\`\`\`
`;
};

export const getRootFiles = (origins: OriginConf[]) => {
  return {
    "api.d.ts": rootAPITs(origins),
    "defs.d.ts": rootDefsTs(origins),
    "index.d.ts": rootIndexTs(origins),
    "index.js": rootIndexJs(origins),
    "README.md": rootDocs(origins),
  };
};
