import type { APIs } from "./services/sdk/petstore/spec";
import { getHooksFetchAPIs } from "pontx-hooks-sdk";
import { PontxSDK } from "pontx-sdk-core";
import metaJSON from "./services/sdk/petstore/meta.json";

export const PetStoreAPIs = new PontxSDK({
  getFetchAPIs: getHooksFetchAPIs,
}).getClient<APIs>(metaJSON);

PetStoreAPIs.pet.addPet.request;
