import nodeFetch from "node-fetch";
import { FetchOptions, RequestOptions } from "../types";
import { HttpRequestConfig, PontxBaseRequester, PontxHttpRequester } from "../requester";
import { ApiMethodsProvider, CommonApiMethodsProvider } from "./base";
import { handleSseResponse } from "../sse/nodejs";

export class PontxNodejsRequester extends PontxHttpRequester {
  constructor(public config = new HttpRequestConfig()) {
    super(config);
    this.fetchMethod = nodeFetch;
  }

  fetchMethod = nodeFetch as any;
}

export class NodejsApiMethodsProvider extends CommonApiMethodsProvider {
  pontxRequester: PontxNodejsRequester;

  constructor(config?: HttpRequestConfig) {
    super();

    if (config) {
      this.setDefaults(config);
    }

    this.defaults.handleResponse = handleSseResponse;

    if (config?.securitySchemes) {
      this.pontxRequester = new PontxNodejsRequester({
        securitySchemes: config.securitySchemes,
        baseURL: config.baseURL,
        headers: config.headers,
      });
      if (config?.accessToken) {
        this.pontxRequester.accessToken = config.accessToken;
      }
    } else {
      this.pontxRequester = new PontxNodejsRequester({
        baseURL: config?.baseURL,
        headers: config?.headers,
      });
    }
  }
}
