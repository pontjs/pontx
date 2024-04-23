import type { InnerOriginConfig } from "pontx-manager";
import { PontSpec } from "pontx-spec";

type OriginConf = {
  spec: PontSpec;
  name: string;
  conf: InnerOriginConfig;
};

export const upperCase = (word: string) => {
  if (!word) return word;

  return word[0].toUpperCase() + word.slice(1);
};

export const rootDefsTs = (origins: OriginConf[]) => {
  return (
    origins
      .map((origin) => {
        return `export { defs as ${origin.name} } from './${origin.name}/type';`;
      })
      .join("\n") + "\n"
  );
};

export const rootAPITs = (origins: OriginConf[], SdkMethodsFn = "") => {
  return (
    origins
      .map((origin) => {
        return `export { API as ${origin.name} } from './${origin.name}/type';`;
      })
      .join("\n") + "\n"
  );
};

export const rootIndexDTs = (origins: OriginConf[]) => {
  return `import * as defs from "./defs";
${origins
  .map((origin) => {
    return [
      `import type { API as ${upperCase(origin.name)}API } from "./${origin.name}/type";`,
      `import type { APIs as ${upperCase(origin.name)}APIs } from "./${origin.name}/spec";`,
    ].join("\n");
  })
  .join("\n")}

export namespace APIs {
${origins
  .map((origin) => {
    return `export { ${upperCase(origin.name)}APIs as ${origin.name} };`;
  })
  .join("\n")}
}

export namespace API {
${origins
  .map((origin) => {
    return `export { ${upperCase(origin.name)}API as ${origin.name} };`;
  })
  .join("\n")}
}

export { defs };
`;
};

export const rootIndexTs = (origins: OriginConf[]) => {
  return `import type * as defs from "./defs";
import type * as API from "./api";
${origins
  .map((origin) => {
    return [`import { APIs as ${upperCase(origin.name)}APIs } from "./${origin.name}/";`].join("\n");
  })
  .join("\n")}
import { rootDefaults } from "./defaults";
import { DefaultsType, RootDefaultsType, setSpecDefaults, SpecNames, DefaultsMapType } from "./request";

export const APIs = {
${origins
  .map((origin) => {
    return `  ${origin.name}: ${upperCase(origin.name)}APIs,`;
  })
  .join("\n")}
}

export const setRootDefaults = (defaults: RootDefaultsType) => {
  Object.keys(defaults).forEach((key) => {
    rootDefaults[key] = defaults[key];
  });
};

export const setDefaultsAll = (defaults: RootDefaultsType) => {
  Object.keys(defaults).forEach((key) => {
    rootDefaults[key] = defaults[key];
  });

  Object.keys(APIs).forEach((specName: any) => {
    setSpecDefaults(specName);
  });
};

export const setDefaults = (
  defaultsMap: DefaultsMapType
) => {
  Object.keys(APIs).forEach((specName: any) => {
    const defaults = defaultsMap?.[specName];

    if (defaults && Object.keys(defaults)?.length > 0) {
      setSpecDefaults(specName, defaults);
    }
  });
};

export { defs, API, ${origins.map((origin) => `${upperCase(origin.name)}APIs`).join(", ")} };
`;
};

export const requestTs = (origins: OriginConf[]) => {
  return `${origins
    .map(
      (origin) =>
        `import { setDefaults as set${upperCase(origin.name)}Defaults, DefaultsType as ${upperCase(origin.name)}DefaultsType  } from "./${origin.name}/request";`,
    )
    .join("\n")}

export type SpecNames = ${origins.map((origin) => `'${origin.name}'`).join(" | ")};

export type DefaultsMapType = {
${origins.map((origin) => `  ${origin.name}: ${upperCase(origin.name)}DefaultsType;`).join("\n")}
};

export type DefaultsType<SpecName extends SpecNames> = DefaultsMapType[SpecName];

export type RootDefaultsType = ${origins.map((origin) => `${upperCase(origin.name)}DefaultsType`).join(" & ")};

export const setSpecDefaults = <SpecName extends SpecNames, >(specName: SpecName, defaults: DefaultsType<SpecName> = {} as any) => {
  switch (specName) {
${origins
  .map((origin) => {
    return [
      `    case "${origin.name}": {`,
      `      set${upperCase(origin.name)}Defaults(defaults as any);`,
      `      break;`,
      `    }`,
    ].join("\n");
  })
  .join("\n")}
  }
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
    "index.ts": rootIndexTs(origins),
    "request.ts": requestTs(origins),
    // "index.d.ts": rootIndexTs(origins),
    // "index.js": rootIndexJs(origins),
    "README.md": rootDocs(origins),
    "defaults.ts": `export const rootDefaults = {} as any;`,
  };
};
