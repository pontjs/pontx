/**
 * @author pontx-generator
 * @description Graceful Client Pontx Plugin
 */

import type { Plugin } from '@pontx/spec';
import { generateGracefulClient } from './index';

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
