jest.setTimeout(300000);

import * as assert from "assert";
import * as path from "path";
import * as httpServer from "http-server";
import * as fs from "fs-extra";
import { PontManager } from "pontx-manager";

const projectTestPath = path.join(__dirname, "../../../../tests");
const server = httpServer.createServer({
  root: path.join(projectTestPath, "origins"),
});
const clearDir = (dirName: string) => {
  try {
    const fullpath = path.join(projectTestPath, dirName);

    if (fs.existsSync(fullpath)) {
      fs.removeSync(fullpath);
    }
  } catch (error) {}
};
const exists = (filepath) => fs.existsSync(path.join(projectTestPath, filepath));

const createManager = (configName: string) => {
  try {
    const configContent = path.join(projectTestPath, "configs", configName);
    const contentStr = fs.readFileSync(configContent).toString("utf8");
    const configJSON = JSON.parse(contentStr);
    return PontManager.constructorFromPontConfig(configJSON, path.join(projectTestPath, "configs"));
  } catch (e) {}
};

describe("pont功能测试", () => {
  let manager: PontManager;
  beforeAll(function (done) {
    // 清除路径
    clearDir("apis");

    server.listen({ port: 9099 }, async () => {
      console.log("http server start successfull");
      manager = (await createManager("multiple-origins-pontx-config.json"))!;
      await PontManager.generateCode(manager);

      done();
    });
  });
  afterAll(function () {
    // clearDir("apis");
    server.close();
  });
  afterEach(() => {
    delete (global as any).__mobxInstanceCount; // prevent warnings
  });

  test("index.ts should exists", () => {
    assert.ok(exists("apis/sdk/index.ts"));
    assert.ok(exists("apis/sdk/api1/index.ts"));
    assert.ok(exists("apis/sdk/api2/index.ts"));
  });

  // const idnexTs = fs.readFileSync(path.join(projectTestPath, "apis/sdk", "index.d.ts"), "utf8");

  // test("index.d.ts should export class DataTransOutput<T0=any>", () => {
  //   let rightCode = oneline(`
  //           export class DataTransOutput<T0=any> {
  //                   /** 返回数据 */
  //                   data?: T0;

  //                   /** 错误码。
  //                       100000 成功
  //                       200000 入参不合法
  //                       400000 权限不足
  //                       500000 服务失败 */
  //                   transCode: number;

  //                   /** 错误信息。成功：“成功” 失败：“失败对应的msg” */
  //                   transMessage: string;

  //                   /** 信息详情” */
  //                   transMessageDetail: string;
  //               }
  //       `);
  //   assert.ok(apidts.includes(rightCode));
  // });

  // test("api.d.ts should not export class DataTransOutput", () => {
  //   let wrongCode = oneline(`export class DataTransOutput {`);

  //   assert.ok(!apidts.includes(wrongCode));
  // });

  // test("api.d.ts should translate chinese of baseClass to english", () => {
  //   let dict: { [key: string]: string } = Translator.dict;
  //   ["通用请求参数token", "输出参数vo", "查询参数", "abc输出参数", " 中英文 混合 带 空格 Vo "].forEach((cnKey) => {
  //     const enKey = dict[cnKey];
  //     assert.ok(enKey);
  //     assert.ok(apidts.includes(enKey));
  //   });
  // });

  // test("api.d.ts should transform Map without template params to object", () => {
  //   let rightCode = oneline(`
  //   export namespace getAllMsgForMap {
  //     export class Params {
  //       /** accountTime */
  //       accountTime: string;
  //       /** type */
  //       type: string;
  //     }

  //     export type Response = defs.api1.Result<Array<ObjectMap>>;
  //     export const init: Response;
  //     export function request(
  //       params: Params,
  //     ): Promise<defs.api1.Result<Array<ObjectMap>>>;
  //   }
  //   `);

  //   assert.ok(apidts.includes(rightCode));
  // });

  // test("config-single-usingMultipleOrigins should has multiple origin fileStructure", async () => {
  //   // 清除路径
  //   clearDir("services");
  //   const manager = await createManager("config-single-usingMultipleOrigins.json");
  //   assert.ok(exists("services/api1/api.d.ts"));
  //   assert.ok(!exists("services/api2/api.d.ts"));
  //   manager.stopPolling();
  // });

  // it("mods or base update should generate history file and report", async () => {
  //   const jsonPath = getPath("fixtures/api-docs.json");
  //   const originSource = fs.readFileSync(jsonPath).toString("utf8");

  //   // 模拟后端接口变更
  //   try {
  //     const swaggerObj = JSON.parse(originSource) as SwaggerDataSource;

  //     // 模拟改变参数是否必传
  //     swaggerObj["paths"]["/api/core/asset/credit/query/pastCreditCardBillGather"]["post"]["parameters"][0].required =
  //       false;

  //     fs.writeFileSync(jsonPath, JSON.stringify(swaggerObj));

  //     await manager.readRemoteDataSource();
  //     const diffs = manager.getReportData().diffs;

  //     assert.ok(diffs[diffs.length - 1].modDiffs.length === 1);
  //     fs.writeFileSync(jsonPath, originSource);
  //   } catch (e) {}
  // });
});
