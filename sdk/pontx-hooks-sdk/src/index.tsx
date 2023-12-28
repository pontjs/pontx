import { APIMeta, PontxFetcher, SdkMethods, PontxSDK } from "pontx-sdk-core";
import useSWR, { preload } from "swr";

export const SdkMethodsFn = (apiMeta: APIMeta, fetcher: PontxFetcher, { specMeta }): SdkMethods => {
  const myFetch = async (url, options = {}) => {
    const result = await fetch(url, options);
    return fetcher.handleResponse(result, url, options, { apiMeta });
  };
  fetcher.request = async (params, requestOptions, config) => {
    const { url, options } = await fetcher.beforeRequest(params, requestOptions, config);

    return myFetch(url, options);
  };
  const request = (params, fetchOptions = {}) => {
    return fetcher.request(params, fetchOptions, { apiMeta, specMeta });
  };

  const getSwrKey = (params: any) => {
    const prefix = fetcher.getUrlPrefix(specMeta);
    const swrKey = prefix + fetcher.getUrl(apiMeta.path, params);
    return swrKey;
  };

  if (apiMeta.method?.toUpperCase() === "GET") {
    return {
      request,
      getSwrKey,
      useRequest: (params: any, requestOptions, swrOptions: any) => {
        const swrKey = getSwrKey(params);
        const fetchOptions = fetcher.getFetchOptions(swrKey, requestOptions, { apiMeta });

        return useSWR(
          swrKey,
          (url) => {
            return myFetch(url, fetchOptions);
          },
          swrOptions,
        );
      },
      preload: (params: any) => {
        const swrKey = getSwrKey(params);

        return preload(swrKey, myFetch);
      },
    };
  }

  return {
    request,
    getSwrKey,
    useDeprecatedRequest: (params: any, swrOptions: any) => {
      const swrKey = getSwrKey(params);
      return useSWR(swrKey, request, swrOptions);
    },
  };
};

export type * from "./type.ts";

export * from "pontx-sdk-core";
