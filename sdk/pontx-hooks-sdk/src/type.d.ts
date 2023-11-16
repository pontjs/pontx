import type { SWRResponse, SWRConfiguration, Fetcher } from "swr";

type SWRKey = string;

type OptionalBodyRequest<Params, BodyParams, Response> = BodyParams extends null | undefined
  ? (params: Params, options?: RequestInit) => Promise<Response>
  : (params: Params, options?: { body: BodyParams } & Omit<RequestInit, "body" | "params">) => Promise<Response>;

export type RequestMethods<Params = any, BodyParams = any, Response = any> = BodyParams extends null | undefined
  ? {
      request: OptionalBodyRequest<Params, BodyParams, Response>;
      useRequest: <Error = any, SWROptions extends SWRConfiguration<Response, Error, Fetcher<Response, SWRKey>>>(
        params: Params,
        swrOptions?: SWROptions,
      ) => SWRResponse<Response, Error, Fetcher<Response, SWRKey>>;
      getSwrKey: (params: Params) => string;
      preload: (params: Params) => Promise<Response>;
    }
  : {
      request: OptionalBodyRequest<Params, BodyParams, Response>;
      useDeprecatedRequest: <
        Error = any,
        SWROptions extends SWRConfiguration<Response, Error, Fetcher<Response, SWRKey>>,
      >(
        params: Params,
        swrOptions?: SWROptions,
      ) => SWRResponse<Response, Error, Fetcher<Response, SWRKey>>;
      getSwrKey: (params: Params) => string;
    };
