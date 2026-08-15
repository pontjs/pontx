import { describe, expectTypeOf, it } from "vitest";
import type { GracefulClient } from "./type";

type ApiSurface = {
  getRates: (params: { base: string }) => Promise<{ rate: number }[]>;
  currencies: {
    getCurrency: (code: string) => Promise<{ code: string }>;
  };
};

describe("GracefulClient", () => {
  it("preserves root-level Endpoint methods while mapping Controllers", () => {
    type Client = GracefulClient<ApiSurface>;

    expectTypeOf<Client["getRates"]>().toEqualTypeOf<ApiSurface["getRates"]>();
    expectTypeOf<Client["currencies"]["getCurrency"]>()
      .toEqualTypeOf<ApiSurface["currencies"]["getCurrency"]>();
  });
});
