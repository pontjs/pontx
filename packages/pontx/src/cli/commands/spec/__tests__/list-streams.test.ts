import { describe, expect, it, vi } from "vitest";
import { listStreamsCommand } from "../list-streams";

const spec = {
  name: "fx-prices",
  apis: {},
  asyncapi: {
    operations: {
      receivePrice: {
        name: "receivePrice",
        action: "receive" as const,
        channel: "quotes",
        messages: ["price"],
        summary: "Live price update",
      },
    },
  },
};

function context() {
  return {
    getManager: async () => ({
      resolvedConfig: { origins: [{ name: "fx-prices", spec }] },
    }),
  } as any;
}

describe("listStreamsCommand", () => {
  it("lists stream metadata without connecting", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await listStreamsCommand(context(), "fx-prices", { json: true });

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('"type": "streams"')
    );
    expect(log).toHaveBeenCalledWith(expect.stringContaining("receivePrice"));
    log.mockRestore();
  });

  it("reports an HTTP-only spec without creating a connection", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const httpOnlyContext = {
      getManager: async () => ({
        resolvedConfig: { origins: [{ name: "rest", spec: { name: "rest", apis: {} } }] },
      }),
    } as any;

    await listStreamsCommand(httpOnlyContext, "rest");

    expect(log).toHaveBeenCalledWith("No streaming operations in spec: rest");
    log.mockRestore();
  });
});
