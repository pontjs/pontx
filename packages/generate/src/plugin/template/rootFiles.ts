import { InnerOriginConfig } from "pontx-manager";
import { PontSpec } from "pontx-spec";

type OriginConf = {
  spec: PontSpec;
  name: string;
  conf: InnerOriginConfig;
};

export const rootApiTs = (origins: OriginConf[]) => {
  return `/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
import { pontxSDK } from './core';

${origins
  .map(
    (origin) => `import ${origin.name}Meta from './${origin.name}/meta.json';
import type { APIs as ${origin.name}APIs } from './${origin.name}/spec';`,
  )
  .join("\n")}

${origins
  .map((origin) => `export const ${origin.name} = pontxSDK.getClient<${origin.name}APIs>(${origin.name}Meta as any);`)
  .join("\n")}
`;
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

export const rootCoreTs = (origins: OriginConf[], SdkMethodsFn = "") => {
  const SdkMethodsFnCode = SdkMethodsFn || origins?.[0]?.conf?.plugins?.generate?.options?.SdkMethodsFn || "";
  return `/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
${SdkMethodsFnCode}import { PontxSDK } from 'pontx-sdk-core';

export const pontxSDK = new PontxSDK(${SdkMethodsFnCode ? "{ SdkMethodsFn }" : ""});
`;
};

export const rootIndexTs = (origins: OriginConf[]) => {
  return `/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
import * as API from './api';
import * as defs from './defs';

export {
	API,
	defs
};
`;
};

export const getRootFiles = (origins: OriginConf[]) => {
  return {
    "api.ts": rootApiTs(origins),
    "defs.ts": rootDefsTs(origins),
    "core.ts": rootCoreTs(origins),
    "index.ts": rootIndexTs(origins),
  };
};
