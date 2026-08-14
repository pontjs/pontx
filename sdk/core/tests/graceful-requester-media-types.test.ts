import { describe, expect, it, vi } from "vitest";
import { createFetchRequester } from "../src/core/create-requester";
import { createGracefulRequester } from "../src/graceful-client/requester";

const apiKey = "signatureRequest/signatureRequestSend";
const apiMeta = {
  method: "POST",
  path: "/signature_request/send",
  consumes: ["application/json", "multipart/form-data"],
  produces: ["application/json"],
  pathParams: null,
  queryParams: null,
  bodyParams: {
    contentType: "application/json",
    canMerge: true,
    fields: ["title", "file"],
  },
} as const;

function requester(baseRequestFn: ReturnType<typeof vi.fn>) {
  return createGracefulRequester({
    pontxSpecMeta: {
      name: "dropbox-sign",
      hasTags: true,
      apis: { [apiKey]: apiMeta },
    } as any,
    baseUrl: "https://api.hellosign.com/v3",
    baseRequestFn,
  })({
    apiKey,
    apiMeta: apiMeta as any,
    apiSelector: {
      specName: "dropbox-sign",
      controllerName: "signatureRequest",
      apiName: "signatureRequestSend",
    },
  });
}

describe("graceful requester media types", () => {
  it("lets fetch add the multipart boundary when a caller selects multipart", async () => {
    const baseRequestFn = vi.fn(async () => ({ ok: true }));
    const send = requester(baseRequestFn);
    const file = new Blob(["contract"], { type: "text/plain" });

    await send(
      { title: "NDA", file },
      { headers: { "content-type": "multipart/form-data" } },
    );

    const [, init] = baseRequestFn.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    expect(Array.from((init.body as FormData).keys())).toEqual(["title", "file"]);
    expect(
      Object.keys(init.headers).some((name) => name.toLowerCase() === "content-type"),
    ).toBe(false);
  });

  it("keeps JSON as the deterministic default for dual-media request bodies", async () => {
    const baseRequestFn = vi.fn(async () => ({ ok: true }));
    const send = requester(baseRequestFn);

    await send({ title: "NDA" });

    const [, init] = baseRequestFn.mock.calls[0];
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ title: "NDA" }));
  });
});

describe("fetch requester media types", () => {
  it("honors a caller-selected multipart media type and removes its bare header", async () => {
    const baseRequestFn = vi.fn(async () => ({ ok: true }));
    const createRequester = createFetchRequester({
      pontxSpecMeta: {
        name: "dropbox-sign",
        hasTags: true,
        apis: {
          [apiKey]: {
            method: "POST",
            path: "/signature_request/send",
            hasBody: true,
            hasParams: false,
            consumes: ["application/json", "multipart/form-data"],
          },
        },
      },
      baseUrl: "https://api.hellosign.com/v3",
      baseRequestFn,
    });
    const send = createRequester({
      apiKey,
      apiMeta: {
        method: "POST",
        path: "/signature_request/send",
        hasBody: true,
        hasParams: false,
        consumes: ["application/json", "multipart/form-data"],
      },
      apiSelector: {
        specName: "dropbox-sign",
        controllerName: "signatureRequest",
        apiName: "signatureRequestSend",
      },
    });

    await send({}, {
      body: { title: "NDA", file: new Blob(["contract"]) },
      headers: { "Content-Type": "multipart/form-data" },
    });

    const [, init] = baseRequestFn.mock.calls[0];
    expect(init.body).toBeInstanceOf(FormData);
    expect(
      Object.keys(init.headers).some((name) => name.toLowerCase() === "content-type"),
    ).toBe(false);
  });
});
