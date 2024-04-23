import { RequestOptions } from "./types";

export interface Authentication {
  /**
   * Apply authentication settings to header and query params.
   */
  applyToRequest(requestOptions: RequestOptions): void;
}

export class HttpBasicAuth implements Authentication {
  public username: string = "";
  public password: string = "";

  applyToRequest(requestOptions: RequestOptions): void {
    requestOptions.auth = {
      username: this.username,
      password: this.password,
    };
  }
}

export class ApiKeyAuth implements Authentication {
  public apiKey: string = "";

  constructor(
    private location: string,
    private paramName: string,
  ) {}

  applyToRequest(requestOptions: RequestOptions): void {
    if (this.location == "query") {
      if (!requestOptions.params) {
        (<any>requestOptions.params) = {
          [this.paramName]: this.apiKey,
        };
      } else {
        (<any>requestOptions.params)[this.paramName] = this.apiKey;
      }
    } else if (this.location == "header" && requestOptions && requestOptions.headers) {
      requestOptions.headers[this.paramName] = this.apiKey;
    }
  }
}

export class OAuth implements Authentication {
  public accessToken: string = "";

  applyToRequest(requestOptions: RequestOptions): void {
    if (requestOptions && requestOptions.headers) {
      requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
    }
  }
}

export class VoidAuth implements Authentication {
  public username: string = "";
  public password: string = "";

  applyToRequest(_: RequestOptions): void {
    // Do nothing
  }
}
