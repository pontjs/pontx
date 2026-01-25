/**
 * Type tests for @pontx/nodejs-sdk
 *
 * These tests verify that TypeScript types are correctly inferred and enforced.
 * They will be executed by the type checker (tsc) rather than at runtime.
 *
 * Note: These are placeholder tests. Actual type tests will be added as types are implemented.
 */

// Example type test structure (to be replaced with actual tests):
//
// import { expectType } from 'tsd';
// import { createClient, Client, APIMethod } from '../../src';
//
// // Test: Client type inference
// declare const client: Client<{
//   users: {
//     getUser: APIMethod<{ id: number }, void, { id: number; name: string }>;
//   };
// }>;
//
// expectType<{ id: number; name: string }>(
//   await client.users.getUser.request({ id: 1 })
// );

/**
 * Type Testing Strategy:
 *
 * 1. Test type inference from PontxSpecMeta
 * 2. Test conditional types for body parameters (hasBody)
 * 3. Test conditional types for query parameters (hasParams)
 * 4. Test Response type inference
 * 5. Test Client and Controller type mappings
 * 6. Test optional configuration types
 * 7. Test custom usage types
 *
 * Tools to consider:
 * - tsd: TypeScript Definition testing tool
 * - vitest with expectTypeOf (built-in)
 * - @ts-expect-error for negative tests
 */

export {};