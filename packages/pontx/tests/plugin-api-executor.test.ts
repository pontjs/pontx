/**
 * Tests for Plugin apiExecutor lifecycle hook
 */

import { describe, it, expect } from 'vitest';
import type { Plugin, ApiExecutorContext } from '../src/type';

describe('Plugin apiExecutor lifecycle hook', () => {
  it('should allow plugins with apiExecutor hook', () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async (context: ApiExecutorContext) => {
        return { success: true };
      },
    };

    expect(plugin.apiExecutor).toBeDefined();
    expect(typeof plugin.apiExecutor).toBe('function');
  });

  it('should allow plugins without apiExecutor hook (backward compatibility)', () => {
    const plugin: Plugin = {
      name: 'legacy-plugin',
      generate: async (spec, options) => {
        return {};
      },
    };

    expect(plugin.apiExecutor).toBeUndefined();
  });

  it('should have correct ApiExecutorContext interface', async () => {
    const context: ApiExecutorContext = {
      apiSelector: {
        specName: 'test-spec',
        tagName: 'pets',
        apiName: 'getPetById',
      },
      apiMeta: {
        path: '/pets/{petId}',
        method: 'GET',
        description: 'Get pet by ID',
        parameters: [
          {
            name: 'petId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      toolParams: {
        petId: '123',
      },
      options: {
        resolvedConfig: {
          rootDir: '/test',
          configDir: '/test',
          configPath: '/test/pontx.config.ts',
          outDir: '/test/api',
          origins: [],
        },
      },
    };

    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async (ctx) => {
        expect(ctx.apiSelector.specName).toBe('test-spec');
        expect(ctx.apiMeta.path).toBe('/pets/{petId}');
        expect(ctx.toolParams.petId).toBe('123');
        return { data: 'test-response' };
      },
    };

    const result = await plugin.apiExecutor!(context);
    expect(result).toEqual({ data: 'test-response' });
  });

  it('should accept Promise<unknown> return type', async () => {
    const plugin: Plugin = {
      name: 'test-plugin',
      apiExecutor: async () => {
        // Should accept any type: object, array, string, number, etc.
        return { id: 1, name: 'test' };
      },
    };

    const result = await plugin.apiExecutor!({} as ApiExecutorContext);
    expect(result).toHaveProperty('id');
  });

  it('should allow apiExecutor to throw errors', async () => {
    const plugin: Plugin = {
      name: 'error-plugin',
      apiExecutor: async () => {
        throw new Error('API execution failed');
      },
    };

    await expect(plugin.apiExecutor!({} as ApiExecutorContext)).rejects.toThrow(
      'API execution failed'
    );
  });
});
