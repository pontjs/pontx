import type { APIs } from "./services/sdk/petstore/spec";
import { PontxSDK, getFetchAPIs } from "pontx-async-sdk";
import type { FetchAPIs } from "pontx-async-sdk";
import metaJSON from "./services/sdk/petstore/meta.json";
import useSWR, { preload } from "swr";

const getHooksFetchAPIs: FetchAPIs = (meta, apiMeta, fetchHelper) => {
  const defaultFetchAPIs = getFetchAPIs(meta, apiMeta, fetchHelper);
  const request = defaultFetchAPIs.request;

  const getSwrKey = (params: any) => {
    const swrKey = fetchHelper.getUrl(apiMeta.path, params);
    return swrKey;
  };
  const originRequest = fetchHelper.request(apiMeta);

  if (apiMeta.method?.toUpperCase() === "GET") {
    return {
      request,
      getSwrKey,
      useRequest: (params: any, swrOptions: any) => {
        const swrKey = getSwrKey(params);
        return useSWR(swrKey, originRequest, swrOptions);
      },
      preload: (params: any) => {
        const swrKey = getSwrKey(params);
        return preload(swrKey, request);
      },
    };
  }

  return {
    request,
    getSwrKey,
    useDeprecatedRequest: (params: any, swrOptions: any) => {
      const swrKey = getSwrKey(params);
      return useSWR(swrKey, originRequest, swrOptions);
    },
  };
};

export const PetStoreAPIs = new PontxSDK({
  getFetchAPIs: getHooksFetchAPIs,
}).getClient<APIs>(metaJSON);

PetStoreAPIs.pet.addPet.request;
