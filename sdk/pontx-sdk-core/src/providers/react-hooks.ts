import { HttpApiMethodsProvider } from "./fetch";
import { handleResponse } from "../helper";
import { APIMeta, FetchOptions, RequestOptions } from "../types";
import useSWR, { SWRConfiguration, SWRResponse, preload } from "swr";
import { HttpRequestConfig, defaultPontxRequester } from "../requester";

export class ReactHooksApiMethodsProvider extends HttpApiMethodsProvider {
  pontxRequester = defaultPontxRequester;

  getSDKMethods<Method, Response>(
    apiMeta: any,
    specMeta: any,
  ): Method extends "GET"
    ? {
        request: (fetchOptions?: RequestInit) => Promise<Response>;
        getSwrKey: () => string;
        useRequest: (params: {}, fetchOptions?: RequestInit, swrOptions?: SWRConfiguration) => SWRResponse<Response>;
        preload: (fetchOptions?: RequestInit) => Promise<Response>;
      }
    : {
        request: (fetchOptions?: RequestInit) => Promise<Response>;
        getSwrKey: () => string;
        useDepreactedRequest: (
          params: {},
          fetchOptions?: RequestInit,
          swrOptions?: SWRConfiguration,
        ) => SWRResponse<Response>;
      };
  getSDKMethods<Method, Params, BodyParams, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (params: Params, body: BodyParams, fetchOptions?: RequestInit) => Promise<Response>;
    getSwrKey: (params: Params) => string;
    useDepreactedRequest: (
      params: Params,
      body: BodyParams,
      fetchOptions: RequestInit,
      swrOptions?: SWRConfiguration,
    ) => SWRResponse<Response>;
  };
  getSDKMethods<Method, Params, Response>(
    apiMeta: any,
    specMeta: any,
  ): Method extends "GET"
    ? {
        request: (params: Params, fetchOptions?: RequestInit) => Promise<Response>;
        getSwrKey: (params: Params) => string;
        useRequest: (
          params: Params,
          fetchOptions?: RequestInit,
          swrOptions?: SWRConfiguration,
        ) => SWRResponse<Response>;
        preload: (params: Params, fetchOptions?: RequestInit) => Promise<Response>;
      }
    : {
        request: (params: Params, fetchOptions?: RequestInit) => Promise<Response>;
        getSwrKey: (params: Params) => string;
        useDepreactedRequest: (
          params: Params,
          fetchOptions?: RequestInit,
          swrOptions?: SWRConfiguration,
        ) => SWRResponse<Response>;
      };
  getSDKMethods<T1, T2, T3, T4>(apiMeta: APIMeta, specMeta): any {
    const buildFetchOptions = (fetchOptions: RequestInit = {}) => {
      const finalOptions = { ...fetchOptions, ...(this.defaults || {}), params: {} };
      const requestOptions = this.buildRequestOptionsByMeta(finalOptions, apiMeta, specMeta);
      const { url, ...rest } = requestOptions;

      return rest;
    };
    const getSwrKey = (params: any) => {
      if (!params) {
        return null;
      }

      const swrKey = this.pontxRequester.getFetchUrl(apiMeta.path, params);
      return swrKey;
    };
    const fetchBySwrKey = (swrKey: string, fetchOptions: RequestOptions = {}) => {
      return this.pontxRequester.request({
        ...fetchOptions,
        url: swrKey,
      });
    };

    const request = (...args): Promise<any> => {
      return (super.getSDKMethods(apiMeta, specMeta).request as any)(...args);
    };
    const useRequest = (params, fetchOptions: RequestInit = {}, swrOptions: any) => {
      const swrKey = getSwrKey(params);
      const options = buildFetchOptions(fetchOptions);

      return useSWR(
        swrKey,
        (url) => {
          return this.pontxRequester.request({
            ...options,
            url: swrKey,
          });
        },
        swrOptions,
      );
    };

    if (apiMeta.method?.toUpperCase() === "GET") {
      return {
        request,
        getSwrKey,
        useRequest,
        preload: (params: any, fetchOptions: RequestInit = {}) => {
          const swrKey = getSwrKey(params);
          const options = buildFetchOptions(fetchOptions);

          return preload(swrKey, (url) => fetchBySwrKey(url, options));
        },
      };
    }

    return {
      request,
      getSwrKey,
      useDeprecatedRequest: useRequest,
    };
  }
}
