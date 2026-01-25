/**
 * @author jasonHzq
 * @description Elegant Client generic type definitions
 *
 * Design principles:
 * 1. High code reuse through generic abstraction
 * 2. Support both Flat and Controller modes
 * 3. Clear type inference, easy to understand and maintain
 */

/* ============================================================================
 * API Metadata Definitions
 * ========================================================================== */

/**
 * Base API metadata type
 */
export interface APIMetaBase {
  /** Response type */
  Response: any;
}

/**
 * Pontx API metadata
 * Characteristics: params and body are separated
 */
export interface BrowserAPIMeta extends APIMetaBase {
  /** URL parameters (path/query) */
  params: Record<string, any>;
  /** Request body parameters */
  bodyParams?: any;
}

/**
 * Pontx API metadata
 * Characteristics: params and body are separated
 */
export interface FetchAPIMeta extends APIMetaBase {
  /** URL parameters (path/query) */
  Params: Record<string, any>;
  /** Request body parameters */
  BodyParams?: any;
}

/**
 * RPC API metadata
 * Characteristics: all request parameters are merged
 *
 * @deprecated RPC support has been removed from createBaseClient.
 * This type is kept for backwards compatibility and potential future use.
 * Consider using FetchAPIMeta or BrowserAPIMeta instead.
 */
export interface RpcAPIMeta extends APIMetaBase {
  /** RPC request parameters */
  RequestParams: any;
}

/* ============================================================================
 * Requester Type Definitions
 * ========================================================================== */

/**
 * Pontx-style requester
 * Signature: (params?, init & { body? }) => Promise<Response>
 */
export interface FetchRequesterType<TMeta extends FetchAPIMeta> {
  (
    params?: TMeta['Params'],
    init?: RequestInit & { body?: TMeta['BodyParams'] },
  ): Promise<TMeta['Response']>;
}

/**
 * Pontx-style requester
 * Signature: (params?, init & { body? }) => Promise<Response>
 */
export interface BrowserRequesterType<TMeta extends BrowserAPIMeta> {
  (
    params?: TMeta['params'],
    init?: RequestInit & { body?: TMeta['bodyParams'] },
  ): Promise<TMeta['Response']>;
}

/**
 * RPC-style requester
 * Signature: (rpcParams?, init) => Promise<Response>
 *
 * @deprecated RPC support has been removed from createBaseClient.
 * This type is kept for backwards compatibility and potential future use.
 * Consider using FetchRequesterType or BrowserRequesterType instead.
 */
export interface RpcRequesterType<TMeta extends RpcAPIMeta> {
  (rpcParams?: TMeta['RequestParams'], init?: RequestInit): Promise<
    TMeta['Response']
  >;
}

/* ============================================================================
 * Core Type Builders
 * ========================================================================== */

/**
 * Check if structure is nested (Controller mode)
 */
type IsNested<T> = T extends Record<string, Record<string, APIMetaBase>>
  ? true
  : false;

/**
 * Controller type builder
 * Maps API metadata to a collection of requesters
 *
 * @template TAPIs - Collection of API metadata
 * @template TLeaf - Leaf method type
 */
type BuildController<
  TAPIs extends Record<string, APIMetaBase>,
  TLeaf extends (meta: any) => any,
> = {
  [K in keyof TAPIs]: TLeaf extends (meta: infer _M) => infer R
    ? TAPIs[K] extends Parameters<TLeaf>[0]
      ? R
      : never
    : never;
};

/**
 * Client type builder
 * Automatically detects and supports both Flat and Controller modes
 *
 * @template T - API definitions (nested or flat structure)
 * @template TLeafBuilder - Leaf method type builder function
 *
 * @example
 * // Controller mode
 * type APIs = {
 *   user: {
 *     getUser: { Params: {id: string}, Response: User };
 *     listUsers: { Params: {}, Response: User[] };
 *   };
 * };
 * type MyClient = BuildClient<APIs, (meta: PontxAPIMeta) => PontxRequesterType<meta>>;
 * // Result: { user: { getUser: (...) => ..., listUsers: (...) => ... } }
 *
 * @example
 * // Flat mode
 * type APIs = {
 *   getUser: { Params: {id: string}, Response: User };
 *   listUsers: { Params: {}, Response: User[] };
 * };
 * type MyClient = BuildClient<APIs, (meta: PontxAPIMeta) => PontxRequesterType<meta>>;
 * // Result: { getUser: (...) => ..., listUsers: (...) => ... }
 */
type BuildClient<T, TLeafBuilder extends (meta: any) => any> =
  // Nested structure: Controller mode (client.tag.api)
  T extends Record<string, Record<string, APIMetaBase>>
    ? {
        [Tag in keyof T]: T[Tag] extends Record<string, APIMetaBase>
          ? BuildController<T[Tag], TLeafBuilder>
          : never;
      }
    : // Flat structure: Flat mode (client.api)
    T extends Record<string, APIMetaBase>
    ? BuildController<T, TLeafBuilder>
    : never;

/* ============================================================================
 * Pontx Client Type
 * ========================================================================== */

/**
 * Pontx Client type
 *
 * Leaf method signature:
 * ```ts
 * apiName(params?: Params, init?: RequestInit & { body?: BodyParams }): Promise<Response>
 * ```
 *
 * @template T - API definitions
 *
 * @example
 * // Controller mode
 * const client: PontxClient<typeof apiDefs> = ...;
 * await client.user.getUser({ id: '1' });
 *
 * @example
 * // Flat mode
 * const client: PontxClient<typeof apiDefs> = ...;
 * await client.getUser({ id: '1' });
 */
export type FetchClient<T> = BuildClient<
  T,
  (meta: FetchAPIMeta) => FetchRequesterType<typeof meta>
>;

export type BrowserClient<T> = BuildClient<
  T,
  (meta: FetchAPIMeta) => FetchRequesterType<typeof meta>
>;

/* ============================================================================
 * RPC Client Type
 * ========================================================================== */

/**
 * RPC Client type
 *
 * Leaf method signature:
 * ```ts
 * apiName(rpcParams?: RequestParams, init?: RequestInit): Promise<Response>
 * ```
 *
 * @deprecated RPC support has been removed from createBaseClient.
 * This type is kept for backwards compatibility and potential future use.
 * Consider using FetchClient or BrowserClient instead.
 *
 * @template T - API definitions
 *
 * @example
 * // Controller mode
 * const client: RpcClient<typeof apiDefs> = ...;
 * await client.user.getUser({ userId: '1' });
 *
 * @example
 * // Flat mode
 * const client: RpcClient<typeof apiDefs> = ...;
 * await client.getUser({ userId: '1' });
 */
export type RpcClient<T> = BuildClient<
  T,
  (meta: RpcAPIMeta) => RpcRequesterType<typeof meta>
>;

/* ============================================================================
 * Type Exports
 * ========================================================================== */

export type {
  /** Generic Client builder */
  BuildClient,
  /** Controller builder */
  BuildController,
  /** Nested structure checker */
  IsNested,
};
