/**
 * @author pontx-generator
 * @description 代码生成器测试
 */

import { describe, it, expect } from 'vitest';
import { generateGracefulClient } from './index';
import { writeFileTree } from './write-files';
import * as fs from 'fs';
import * as path from 'path';

describe('Graceful Client Generator', () => {
  it('should generate apis.ts, apiMeta.ts and schemas.ts', () => {
    /* 读取测试用的 PontxSpec */
    const specPath = path.join(__dirname, 'tests/petstore/api-lock.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

    /* 生成代码 */
    const files = generateGracefulClient(spec);

    /* 验证输出结构 */
    expect(files).toHaveProperty('apis.ts');
    expect(files).toHaveProperty('apiMeta.ts');
    expect(files).toHaveProperty('schemas.ts');

    /* 验证 apis.ts 内容 */
    const apisCode = files['apis.ts'] as string;
    expect(apisCode).toContain('export declare namespace');
    expect(apisCode).toContain('export type APIs');
    expect(apisCode).toContain('import type * as schemas');
    expect(apisCode).toContain('export type pet');
    expect(apisCode).toContain('export type user');

    /* 验证 apiMeta.ts 内容 */
    const apiMetaCode = files['apiMeta.ts'] as string;
    expect(apiMetaCode).toContain('export const apiMeta');
    expect(apiMetaCode).toContain('method:');
    expect(apiMetaCode).toContain('path:');

    /* 验证 schemas.ts 内容 */
    const schemasCode = files['schemas.ts'] as string;
    expect(schemasCode).toContain('export type');
    expect(schemasCode).toContain('Pet');
    expect(schemasCode).toContain('User');
  });

  it('should write files to disk', () => {
    /* 读取测试用的 PontxSpec */
    const specPath = path.join(__dirname, 'tests/petstore/api-lock.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

    /* 生成代码 */
    const files = generateGracefulClient(spec);

    /* 写入到测试目录 */
    const outputDir = path.join(__dirname, './tests/petstore');
    writeFileTree(files, outputDir);

    /* 验证文件已创建 */
    expect(fs.existsSync(path.join(outputDir, 'apis.ts'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'apiMeta.ts'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'schemas.ts'))).toBe(true);

    /* 验证文件内容 */
    const apisContent = fs.readFileSync(
      path.join(outputDir, 'apis.ts'),
      'utf-8',
    );
    expect(apisContent).toContain('export declare namespace');
    expect(apisContent).toContain('export type pet');
    expect(apisContent).toContain('export type user');

    const apiMetaContent = fs.readFileSync(
      path.join(outputDir, 'apiMeta.ts'),
      'utf-8',
    );
    expect(apiMetaContent).toContain('export const apiMeta');

    const schemasContent = fs.readFileSync(
      path.join(outputDir, 'schemas.ts'),
      'utf-8',
    );
    expect(schemasContent).toContain('export type');
    expect(schemasContent).toContain('Pet');
  });
});
