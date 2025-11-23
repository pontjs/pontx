/**
 * Tests for signature mode selection module
 *
 * Requirements covered:
 * - 8.7: selectSignatureMode() SHALL 根据 API 元数据选择单参数或多参数模式
 */

import { describe, it, expect } from 'vitest';
import { selectSignatureMode } from './signature-selector';
import type { PontxAPI } from '@pontx/spec';

describe('selectSignatureMode', () => {
  it('should return three-param for multipart/form-data', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['multipart/form-data'],
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return three-param for application/octet-stream', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/octet-stream'],
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return two-param for application/json with object bodyType', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/json'],
      bodyType: 'object',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('two-param');
  });

  it('should return three-param for application/json with string bodyType', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/json'],
      bodyType: 'string',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return three-param for bodyType array', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['application/json'],
      bodyType: 'array',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return two-param for bodyType none', () => {
    const apiMeta: Partial<PontxAPI> = {
      method: 'GET',
      bodyType: 'none',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('two-param');
  });

  it('should return two-param for undefined consumes and bodyType', () => {
    const apiMeta: Partial<PontxAPI> = {};

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('two-param');
  });

  it('should handle content-type with parameters', () => {
    const apiMeta: Partial<PontxAPI> = {
      consumes: ['multipart/form-data; boundary=----WebKitFormBoundary'],
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return three-param for map bodyType', () => {
    const apiMeta: Partial<PontxAPI> = {
      bodyType: 'map',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });

  it('should return three-param for number bodyType', () => {
    const apiMeta: Partial<PontxAPI> = {
      bodyType: 'number',
    };

    const mode = selectSignatureMode(apiMeta);

    expect(mode).toBe('three-param');
  });
});
