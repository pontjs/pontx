import type {
  ApiCatalogSource,
  HubApiSummary,
  HubEnvelope,
  HubErrorEnvelope,
  HubOperationDetail,
  HubPreview,
  HubRequestInput,
  HubSearchResult,
  HubSkillBundle,
} from "./catalog-source";

export const DEFAULT_HUB_URL =
  process.env.PONTX_HUB_URL || "https://hub.pontx.dev";

export class HubRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "HubRequestError";
  }
}

export class RemoteHubCatalogSource implements ApiCatalogSource {
  readonly baseUrl: string;

  constructor(baseUrl = DEFAULT_HUB_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
    const payload = (await response.json()) as
      | HubEnvelope<T>
      | HubErrorEnvelope;
    if (!response.ok || "error" in payload) {
      const error =
        "error" in payload
          ? payload.error
          : { message: `Hub request failed (${response.status})` };
      throw new HubRequestError(
        error.message,
        response.status,
        "requestId" in error ? error.requestId : undefined,
      );
    }
    return payload.data;
  }

  list(): Promise<HubApiSummary[]> {
    return this.request("/api/v1/catalog");
  }

  search(query: string, locale: "zh" | "en" = "en") {
    return this.request<HubSearchResult[]>(
      `/api/v1/search?q=${encodeURIComponent(query)}&locale=${locale}`,
    );
  }

  operation(apiSlug: string, operationSlug: string) {
    return this.request<HubOperationDetail>(
      `/api/v1/specs/${encodeURIComponent(apiSlug)}/operations/${encodeURIComponent(operationSlug)}`,
    );
  }

  sdk(apiSlug: string) {
    return this.request(`/api/v1/specs/${encodeURIComponent(apiSlug)}/sdk`);
  }

  skill() {
    return this.request<HubSkillBundle>("/api/v1/skill");
  }

  preview(input: HubRequestInput) {
    return this.request<HubPreview>("/api/v1/playground/preview", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  execute(input: HubRequestInput & { confirmationToken?: string }) {
    return this.request<unknown>("/api/v1/playground/execute", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
