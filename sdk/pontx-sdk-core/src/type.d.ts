type OptionalBodyRequest<Params, BodyParams, Response> = BodyParams extends null | undefined
  ? (params: Params, options?: RequestInit) => Promise<Response>
  : (params: Params, options?: { body: BodyParams } & Omit<RequestInit, "body" | "params">) => Promise<Response>;

export type RequestMethods<Params = any, BodyParams = any, Response = any> = {
  request: OptionalBodyRequest<Params, BodyParams, Response>;
};
