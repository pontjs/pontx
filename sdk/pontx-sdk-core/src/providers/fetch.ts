import { HttpRequestConfig, PontxBaseRequester, PontxHttpRequester, defaultPontxRequester } from "../requester";
import { ApiMethodsProvider, CommonApiMethodsProvider } from "./base";
import { handleSseResponse } from "../sse/browser";

export class HttpApiMethodsProvider extends CommonApiMethodsProvider {
  pontxRequester = defaultPontxRequester as PontxHttpRequester;

  constructor(config?: HttpRequestConfig) {
    super(config);

    this.defaults.handleResponse = handleSseResponse;

    if (config?.securitySchemes) {
      this.pontxRequester = new PontxHttpRequester({
        securitySchemes: config.securitySchemes,
        baseURL: config.baseURL,
        headers: config.headers,
      });
      if (config?.accessToken) {
        this.pontxRequester.accessToken = config.accessToken;
      }
    }
  }
}
