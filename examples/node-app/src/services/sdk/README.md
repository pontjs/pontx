# SDK 使用指南

Pontx SDK 分为两部分

1、类型信息和元数据信息。此部分随着 API 元数据的变化，可以不断动态生成。

2、借助类型信息和元数据信息，构建生成 SDK。包括 `api.ts`, `core.ts`, `defs.ts`, `index.ts`。这部分文件是 Pontx 默认生成的，你可以不使用他们，自己构建一份定制化的 SDK。

此处提供一个最简单的构建 SDK 的 Sample。

```ts
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

```
