import { FetchAPIs, getFetchAPIs } from "pontx-sdk-core";
import useSWR, { preload } from "swr";

export const getHooksFetchAPIs: FetchAPIs = (meta, apiMeta, fetchHelper) => {
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

export type * from "./type.ts";
