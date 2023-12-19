/**
 * This file is the default generated SDK usage.
 * You can also implement and expose your custom pontx usage outside of pontx outDir.
 */
import { pontxSDK } from './core';

import petstoreMeta from './petstore/meta.json';
import type { APIs as petstoreAPIs } from './petstore/spec';

export const petstore = pontxSDK.getClient<petstoreAPIs>(petstoreMeta as any);
