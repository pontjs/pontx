import type { APIs } from "./services/sdk/petstore/spec";
import { PontxSDK } from "pontx-async-sdk";
import metaJSON from "./services/sdk/petstore/meta.json";

export const PetStoreAPIs = new PontxSDK().getClient<APIs>(metaJSON);
