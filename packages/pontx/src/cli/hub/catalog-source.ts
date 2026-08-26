export interface HubEnvelope<T> {
  version: "v1";
  data: T;
}

export interface HubErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export interface HubApiSummary {
  slug: string;
  name: string;
  provider: string;
  category: string;
  summary: { zh: string; en: string };
  packageName: string;
  sdkVersion: string;
  operationCount: number;
  authTypes: string[];
}

export interface HubOperation {
  slug: string;
  operationId: string;
  tag: string;
  method: string;
  path: string;
  title: { zh: string; en: string };
  description: { zh: string; en: string };
  parameters: Array<{
    name: string;
    in: "path" | "query" | "header" | "body";
    required: boolean;
    type: string;
    description: { zh: string; en: string };
    example?: unknown;
  }>;
}

export interface HubOperationDetail {
  api: HubApiSummary & {
    servers: Array<{ id: string; url: string }>;
    auth: Array<{
      id: string;
      type: "apiKey" | "bearer" | "oauth2" | "basic";
      envVar?: string;
      usernameEnvVar?: string;
      passwordEnvVar?: string;
    }>;
  };
  operation: HubOperation;
}

export interface HubSearchResult {
  apiSlug: string;
  apiName: string;
  operationSlug: string;
  operationId: string;
  method: string;
  path: string;
  title: string;
  description: string;
}

export interface HubRequestInput {
  apiSlug: string;
  operationSlug: string;
  serverId: string;
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  headers: Record<string, string>;
  body?: unknown;
  auth?:
    | { type: "apiKey"; schemeId: string; value: string }
    | { type: "bearer" | "oauth2"; schemeId: string; token: string }
    | {
        type: "basic";
        schemeId: string;
        username: string;
        password: string;
      };
}

export interface HubPreview {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  curl: string;
  requiresConfirmation: boolean;
  confirmationToken?: string;
  proxyEnabled: boolean;
  warnings: string[];
}

export interface HubSkillBundle {
  name: string;
  version: string;
  files: Record<string, string>;
}

export interface ApiCatalogSource {
  list(): Promise<HubApiSummary[]>;
  search(query: string, locale?: "zh" | "en"): Promise<HubSearchResult[]>;
  operation(apiSlug: string, operationSlug: string): Promise<HubOperationDetail>;
  sdk(apiSlug: string): Promise<unknown>;
  skill(): Promise<HubSkillBundle>;
  preview(input: HubRequestInput): Promise<HubPreview>;
  execute(input: HubRequestInput & { confirmationToken?: string }): Promise<unknown>;
}
