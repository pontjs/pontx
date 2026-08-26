import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HubRequestError,
  RemoteHubCatalogSource,
} from "../remote-source";

afterEach(() => vi.restoreAllMocks());

describe("RemoteHubCatalogSource", () => {
  it("normalizes the base URL and URL-encodes search input", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ version: "v1", data: [] }),
    );
    const source = new RemoteHubCatalogSource("https://hub.example///");

    await source.search("repo issue", "zh");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hub.example/api/v1/search?q=repo%20issue&locale=zh",
      expect.any(Object),
    );
  });

  it("surfaces versioned Hub errors with a request id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json(
        {
          error: {
            code: "not_found",
            message: "API not found",
            requestId: "request-1",
          },
        },
        { status: 404 },
      ),
    );

    await expect(
      new RemoteHubCatalogSource("https://hub.example").sdk("missing"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<HubRequestError>>({
        message: "API not found",
        status: 404,
        requestId: "request-1",
      }),
    );
  });
});

