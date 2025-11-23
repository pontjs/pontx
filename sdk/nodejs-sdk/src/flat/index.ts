/**
 * Flat Client Module
 *
 * This module provides functionality for creating flat API clients,
 * which are designed for API specifications without namespace/controller hierarchy.
 *
 * Exports:
 * - createFlatClient: Main factory function for creating flat clients
 * - buildFlatProxyClient: Builds single-layer proxy client
 * - FlatProxyOptions: Type for proxy builder options
 */

export { createFlatClient } from './create-flat-client';
export { buildFlatProxyClient, type FlatProxyOptions } from './proxy-builder';
