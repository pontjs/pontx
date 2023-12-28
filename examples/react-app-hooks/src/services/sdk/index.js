/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
import { SdkMethodsFn, PontxSDK } from "pontx-hooks-sdk";
export const pontxSDK = new PontxSDK({ SdkMethodsFn });

import petstoreMeta from "./petstore/meta.json";
export const PetstoreAPIs = pontxSDK.getClient(petstoreMeta);

export const APIs = {
  petstore: PetstoreAPIs,
};
