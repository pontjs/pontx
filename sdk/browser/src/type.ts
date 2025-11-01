export type PontxSpecMeta = {
  name: string;
  hasTags: boolean;
  apis: Record<string, PontxAPI>;
};

export type PontxAPI = {
  path: string;
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "HEAD"
    | "OPTIONS"
    | string;
  hasBody: boolean;
  hasParams: boolean;
  consumes?: string[];
  produces?: string[];
};

export type FetchFn = (
  url: string,
  options: RequestInit & {
    getMetadata: () => {
      specName: string;
      controllerName: string;
      apiName: string;
      apiMeta: PontxAPI;
    };
  }
) => Promise<any>;
