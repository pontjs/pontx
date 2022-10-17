"use sloppy";
import * as SWR from "swr";
import { PontCore } from "./core";

export const process = (specAPI = {}) => {
  Object.keys(specAPI).forEach((modName) => {
    specAPI[modName] = { ...specAPI[modName] };
    const mod = specAPI[modName];
    if (modName === "index") {
      return;
    }
    Object.keys(mod).forEach((apiName) => {
      if (apiName === "index") {
        return;
      }
      mod[apiName] = { ...mod[apiName] };
      const api = specAPI[modName][apiName];

      api.mutate = (params = {}, newValue = undefined, shouldRevalidate = true) => {
        return SWR.mutate(PontCore.getUrlKey(api.path, params, api.method), newValue, shouldRevalidate);
      };
      api.trigger = (params = {}, shouldRevalidate = true) => {
        return (SWR as any).trigger(PontCore.getUrlKey(api.path, params, api.method), shouldRevalidate);
      };

      if (api.method === "GET") {
        api.useRequest = (params = {}, swrOptions = {}) => {
          return PontCore.useRequest(api.path, params, swrOptions);
        };
      } else {
        api.useDeprecatedRequest = (params = {}, swrOptions = {}) => {
          return PontCore.useRequest(api.path, params, swrOptions, { method: api.method });
        };
      }

      if (api.hasBody) {
        api.request = (params, body, options = {}) => {
          return PontCore.fetch(PontCore.getUrl(api.path, params, api.method), {
            method: api.method,
            body,
            ...options,
          });
        };
      } else {
        api.request = (params = {}, options = {}) => {
          return PontCore.fetch(PontCore.getUrl(api.path, params, api.method), {
            method: api.method,
            ...options,
          });
        };
      }
    });
  });
};

export const processSingleSpec = () => {
  const globalAPI = (window as any).API;
  if (!globalAPI) {
    return;
  }
  process(globalAPI);
};

export const processSpecs = () => {
  const globalAPI = (window as any).API;

  if (!globalAPI) {
    return;
  }

  Object.keys(globalAPI).forEach((specName) => {
    const spec = globalAPI[specName];
    process(spec);
  });
};
