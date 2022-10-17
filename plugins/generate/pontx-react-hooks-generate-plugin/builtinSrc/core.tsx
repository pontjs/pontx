/**
 * @description pont内置请求单例
 */

import useSWR, { SWRConfig, ConfigInterface } from "swr";
import * as React from "react";

const defaultOptions = {
  /** 错误重试，默认关闭 */
  shouldRetryOnError: false,
  /** 获取焦点时，不重新请求 */
  revalidateOnFocus: false,
  /** 接口缓存 1 分钟 */
  dedupingInterval: 60000,
};

class PontHooksCore {
  static singleInstance = null as any as PontHooksCore;

  static getSignleInstance() {
    if (!PontHooksCore.singleInstance) {
      PontHooksCore.singleInstance = new PontHooksCore();
      return PontHooksCore.singleInstance;
    }
    return PontHooksCore.singleInstance;
  }

  /**
   * fetch请求
   * @param url 请求url
   * @param options fetch 请求配置
   */
  fetch(url: string, options = {}) {
    return fetch(url, options).then((res) => {
      return res.json();
    });
  }

  /**
   * 使用外部传入的请求方法替换默认的fetch请求
   */
  useFetch(fetch: (url: string, options?: any) => Promise<any>) {
    if (typeof fetch !== "function") {
      console.error("fetch should be a function ");
      return;
    }

    this.fetch = fetch;
  }

  getUrl(path: string, queryParams: any, method: string) {
    const params = {
      ...(queryParams || ({} as any)),
    };

    const url = path.replace(/\{([^\\}]*(?:\\.[^\\}]*)*)\}/gm, (match, key) => {
      // eslint-disable-next-line no-param-reassign
      key = key.trim();

      if (params[key] !== undefined) {
        const value = params[key];
        delete params[key];
        return value;
      }
      console.warn("Please set value for template key: ", key);
      return "";
    });

    const paramStr = Object.keys(params)
      .map((key) => {
        return params[key] === undefined ? "" : `${key}=${params[key]}`;
      })
      .filter((id) => id)
      .join("&");

    if (paramStr) {
      return `${url}?${paramStr}`;
    }

    return url;
  }

  getUrlKey(url: any, params = {} as any, method: string) {
    const urlKey =
      typeof params === "function"
        ? () => {
            return params ? PontCore.getUrl(url, params(), method) : null;
          }
        : params
        ? PontCore.getUrl(url, params, method)
        : null;

    return urlKey;
  }

  /**
   * 基于 swr 的取数 hooks
   * @param url 请求地址
   * @param params 请求参数
   * @param options 配置信息
   */
  useRequest(url: any, params = {} as any, swrOptions = {} as any, fetchOptions = {} as any) {
    const fetcher = (requestUrl: any) => PontCore.fetch(requestUrl, fetchOptions);
    const method = fetchOptions?.method || "GET";

    const urlKey = PontCore.getUrlKey(url, params, method);
    const { data, error, isValidating, mutate } = useSWR(urlKey, fetcher, swrOptions);

    return {
      data,
      error,
      mutate,
      isLoading: data === undefined || isValidating,
    };
  }

  SWRProvider: React.FC<ConfigInterface> = (props) => {
    const { ...options } = props;
    const configValue = { ...defaultOptions, ...options } as any;

    return <SWRConfig value={configValue}>{props.children}</SWRConfig>;
  };
}

export const PontCore = PontHooksCore.getSignleInstance();
