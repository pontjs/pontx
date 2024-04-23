import { ApiMethodsProvider } from "./providers/base";
import { mapValues } from "./helper";
import { SpecMeta } from "./types";

export function createSDKClient<APIs, Provider extends ApiMethodsProvider = ApiMethodsProvider>(
  meta: SpecMeta,
  provider: Provider,
): APIs {
  let client = {} as any;
  provider.specMeta = meta;

  if (meta.hasController) {
    client = mapValues(meta.apis, (controller) => {
      return mapValues(controller, (action) => {
        return provider.getSDKMethods(action, meta);
      });
    });
  } else {
    client = mapValues(meta.apis, (action) => {
      return provider.getSDKMethods(action, meta);
    });
  }

  return client;
}
