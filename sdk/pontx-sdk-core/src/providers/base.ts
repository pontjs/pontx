import { PontxBaseRequester, PontxHttpRequester, defaultPontxRequester } from "../requester";
import { addParamsToUrl, getSpecUrlPrefix, handleResponse } from "../helper";
import { RequestOptions } from "../types";
import { EventStreamResponse, OctetStreamResponse } from "../sse/type";

export class ApiMethodsProvider<DefaultRequestOptions extends { [x: string]: any } = any> {
  constructor(defaults?: DefaultRequestOptions) {
    this.defaults = defaults || ({} as DefaultRequestOptions);
  }

  specMeta;

  pontxRequester: PontxBaseRequester = defaultPontxRequester;

  defaults: DefaultRequestOptions;

  setDefaults(options: DefaultRequestOptions) {
    this.defaults = {
      ...(this.defaults || ({} as DefaultRequestOptions)),
      ...(options || {}),
    };
  }

  buildRequestOptionsByMeta(requestOptions, apiMeta, specMeta): RequestOptions {
    const specBaseURL = getSpecUrlPrefix(specMeta, requestOptions?.protocol);

    const headers = requestOptions?.headers || {};
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = apiMeta.consumes?.[0] || "application/json";
    }

    return {
      ...(requestOptions || {}),
      security: apiMeta?.security || specMeta?.security,
      headers,
      url: apiMeta.path,
      specBaseURL,
      apiMeta,
      specMeta,
    };
  }

  getSDKMethods(apiMeta, specMeta?) {
    const hasParams = apiMeta?.hasParams;
    const hasBodyParams = apiMeta?.hasBody;

    let request = (params, fetchOptions = {} as any) => {
      const finalOptions = { ...fetchOptions, ...(this.defaults || {}), params };
      const requestOptions = this.buildRequestOptionsByMeta(finalOptions, apiMeta, specMeta || this.specMeta);

      return this.pontxRequester.request(requestOptions);
    };

    if (hasParams && hasBodyParams) {
      request = (params, bodyParams, fetchOptions = {} as any) => {
        const finalOptions = { ...fetchOptions, ...(this.defaults || {}), params, body: bodyParams };
        const requestOptions = this.buildRequestOptionsByMeta(finalOptions, apiMeta, specMeta || this.specMeta);

        return this.pontxRequester.request(requestOptions);
      };
    } else if (hasBodyParams && !hasParams) {
      request = (bodyParams, fetchOptions = {} as any) => {
        const finalOptions = { ...fetchOptions, ...(this.defaults || {}), body: bodyParams, params: {} };
        const requestOptions = this.buildRequestOptionsByMeta(finalOptions, apiMeta, specMeta || this.specMeta);

        return this.pontxRequester.request(requestOptions);
      };
    }

    return {
      request,
    };
  }

  getEventStreamSDKMethods(apiMeta: any, specMeta: any): any {
    return this.getSDKMethods(apiMeta, specMeta);
  }

  getOctetStreamSDKMethods(apiMeta: any, specMeta: any): any {
    return this.getSDKMethods(apiMeta, specMeta);
  }
}

export class CommonApiMethodsProvider extends ApiMethodsProvider {
  getEventStreamSDKMethods<Method, Params, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (params: Params, fetchOptions?: RequestInit) => Promise<EventStreamResponse<Response>>;
  };
  getEventStreamSDKMethods<Method, Params, BodyParams, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (
      params: Params,
      bodyParams: BodyParams,
      fetchOptions?: RequestInit,
    ) => Promise<EventStreamResponse<Response>>;
  };
  getEventStreamSDKMethods(apiMeta: any, specMeta: any) {
    return super.getEventStreamSDKMethods(apiMeta, specMeta);
  }

  getOctetStreamSDKMethods<Method, Params, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (params: Params, fetchOptions?: RequestInit) => Promise<OctetStreamResponse<Response>>;
  };
  getOctetStreamSDKMethods<Method, Params, BodyParams, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (
      params: Params,
      bodyParams: BodyParams,
      fetchOptions?: RequestInit,
    ) => Promise<OctetStreamResponse<Response>>;
  };
  getOctetStreamSDKMethods(apiMeta: any, specMeta: any) {
    return super.getOctetStreamSDKMethods(apiMeta, specMeta);
  }

  getSDKMethods<Method, Params, BodyParams, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (params: Params, bodyParams: BodyParams, fetchOptions?: RequestInit) => Promise<Response>;
  };
  getSDKMethods<Method, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (fetchOptions?: RequestInit) => Promise<Response>;
  };
  getSDKMethods<Method, Params, Response>(
    apiMeta: any,
    specMeta: any,
  ): {
    request: (params: Params, fetchOptions?: RequestInit) => Promise<Response>;
  };
  getSDKMethods(apiMeta: any, specMeta: any) {
    return super.getSDKMethods(apiMeta, specMeta);
  }
}
