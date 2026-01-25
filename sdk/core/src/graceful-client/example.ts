/**
 * @author jasonHzq
 * @description Graceful Client 使用示例
 */

import { createGracefulClient } from "./index";
import { specMeta } from "../../plugin-src/tests/petstore/apiMeta";
import type { APIs } from "../../plugin-src/tests/petstore/apis";

/* 创建客户端 */
const client = createGracefulClient<APIs>({
  pontxSpecMeta: specMeta as any,
});

/* 使用示例 */
async function examples() {
  /* 1. 只有 path 参数 */
  const pet = await client.pet.getPetById(123);

  /* 2. 只有 query 参数 */
  const token = await client.user.loginUser({
    username: "john",
    password: "123456",
  });

  /* 3. 只有 body 参数 */
  await client.pet.updatePet({
    name: "john",
    photoUrls: [],
  });

  /* 4. path + body（不能合并） */
  await client.pet.uploadFile(123, {
    file: new File([], ""),
  });

  /* 5. query + body 合并（有参数冲突） */
  const user = await client.user.getUserByName("john");

  /* 7. 带 requestInit */
  await client.pet.getPetById(123, {
    headers: {
      Authorization: "Bearer token",
    },
    signal: new AbortController().signal,
  });
}
