/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
import { PontxSDK } from "pontx-sdk-core";
export const pontxSDK = new PontxSDK();

import petstoreMeta from "./petstore/meta.json";
export const PetstoreAPIs = pontxSDK.getClient(petstoreMeta);

export const APIs = {
  petstore: PetstoreAPIs,
};
