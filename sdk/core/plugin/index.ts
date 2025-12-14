/**
 * @author pontx-generator
 * @description Graceful Client 代码生成器
 */

import { PontxSpec } from '@pontx/spec';
import { generateSchemas } from '@pontx/spec';
import { generateApis } from './generate-apis';
import { generateApiMeta } from './generate-api-meta';
import type { FileTree, GeneratorConfig } from './types';
import type { Plugin } from 'pontx';

/**
 * 生成 Graceful Client 代码
 */
export function generateGracefulClient(
  spec: PontxSpec,
  config: GeneratorConfig = {},
): FileTree {
  const files: FileTree = {
    'api-lock.json': JSON.stringify(spec, null, 2),
    'apis.ts': generateApis(spec),
    'apiMeta.ts': generateApiMeta(spec),
  };

  // 生成 schemas.ts
  if (
    spec?.components?.schemas &&
    Object.keys(spec.components.schemas).length
  ) {
    files['schemas.ts'] = generateSchemas(spec);
  }

  return files;
}

/**
 * 创建 Graceful Client 的 Pontx 插件
 */
export function createGracefulClientPlugin(): Plugin {
  return {
    name: 'graceful-client-plugin',

    /**
     * 生成 Graceful Client 代码
     */
    generate: async (spec, options) => {
      const files = generateGracefulClient(spec);
      return files;
    },
  };
}
