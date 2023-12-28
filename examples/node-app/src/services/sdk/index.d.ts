import * as API from "./api";
import * as defs from "./defs";
import type { PontxSDK } from "pontx-sdk-core";

export declare const pontxSDK: PontxSDK;

import type { APIs as petstoreAPIs } from "./petstore/spec";

export declare const PetstoreAPIs: petstoreAPIs;

export declare const APIs = {
  petstore: PetstoreAPIs,
};
export { API, defs };
