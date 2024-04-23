import { handleResponse } from "./helper";

type ContextType =
  | "application/json"
  | "application/x-www-form-urlencoded"
  | "multipart/form-data"
  | "text/plain"
  | "application/octet-stream"
  | "application/xml";

export type FetchType = (url: string, options?: any) => Promise<any>;

export type APIMeta = {
  method: "post" | "get" | "delete" | "put" | "patch" | "options" | "head";
  consumes?: ContextType[];
  produces?: ContextType[];
  apiName: string;
  hasBody?: boolean;
  path: string;
  specName?: string;
  controllerName?: string;
  security?: {
    [x: string]: string[];
  };
};

export type SpecMeta = {
  basePath?: string;
  host?: string;
  hasController?: boolean;
  specName?: string;
  description?: string;
  apis?: any;
  security?: Array<{
    [x: string]: string[];
  }>;
  securitySchemes?: {
    [x: string]: {
      type?: "apiKey" | "http" | "oauth2" | "openIdConnect";
      description?: string;
      name?: string;
      in?: "query" | "header" | "cookie";
      scheme?: "basic" | "bearer";
      bearerFormat?: string;
      flows?: {
        implicit?: {
          authorizationUrl: string;
          scopes: { [x: string]: string };
        };
        password?: {
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
        clientCredentials?: {
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
        authorizationCode?: {
          authorizationUrl: string;
          tokenUrl: string;
          scopes: { [x: string]: string };
        };
      };
      openIdConnectUrl?: string;
    };
  };
};

export type Method =
  | "get"
  | "GET"
  | "delete"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export interface PontxTransformer {
  (data: any, headers?: any): any;
}

export interface FetchOptions<T = any> extends Omit<RequestInit, "body"> {
  body: T;
}

interface AuthOptions {
  user?: string | undefined;
  username?: string | undefined;
  pass?: string | undefined;
  password?: string | undefined;
  sendImmediately?: boolean | undefined;
  bearer?: string | (() => string) | undefined;
}

interface OAuthOptions {
  callback?: string | undefined;
  consumer_key?: string | undefined;
  consumer_secret?: string | undefined;
  token?: string | undefined;
  token_secret?: string | undefined;
  transport_method?: "body" | "header" | "query" | undefined;
  verifier?: string | undefined;
  body_hash?: true | string | undefined;
}

export interface RequestOptions extends RequestInit {
  url?: string;
  method?: Method;
  specBaseURL?: string;
  baseURL?: string;
  transformRequest?: PontxTransformer | PontxTransformer[];
  transformResponse?: PontxTransformer | PontxTransformer[];
  handleResponse?: typeof handleResponse;
  params?: any;
  auth?: AuthOptions | undefined;
  oauth?: OAuthOptions | undefined;
  paramsSerializer?: (params: any) => string;
  security?: Array<{
    [x: string]: string[];
  }>;
  /** A BodyInit object or null to set request's body. */
  body?: BodyInit | null;
  /** A string indicating how the request will interact with the browser's cache to set request's cache. */
  cache?: RequestCache;
  /** A string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. Sets request's credentials. */
  credentials?: RequestCredentials;
  /** A Headers object, an object literal, or an array of two-item arrays to set request's headers. */
  headers?: HeadersInit;
  /** A cryptographic hash of the resource to be fetched by request. Sets request's integrity. */
  integrity?: string;
  /** A boolean to set request's keepalive. */
  keepalive?: boolean;
  /** A string to indicate whether the request will use CORS, or will be restricted to same-origin URLs. Sets request's mode. */
  mode?: RequestMode;
  /** A string indicating whether request follows redirects, results in an error upon encountering a redirect, or returns the redirect (in an opaque fashion). Sets request's redirect. */
  redirect?: RequestRedirect;
  /** A string whose value is a same-origin URL, "about:client", or the empty string, to set request's referrer. */
  referrer?: string;
  /** A referrer policy to set request's referrerPolicy. */
  referrerPolicy?: ReferrerPolicy;
  /** An AbortSignal to set request's signal. */
  signal?: AbortSignal | null;
  /** Can only be null. Used to disassociate request from any Window. */
  window?: null;
  apiMeta?: APIMeta;
  specMeta?: SpecMeta;
}
