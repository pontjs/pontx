import { diffApi } from "../../";

const syncApiSpec = {
  local: {
    description: "将数据同步至旧ApiSpec应用",
    name: "syncApiSpec",
    method: "get",
    path: "/api/v1/convert/{apiGroupUuid}/syncApiSpec",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "ResultDTO",
          templateArgs: [
            {
              typeName: "Map",
              templateArgs: [
                {
                  typeName: "string",
                  templateArgs: [],
                },
                {
                  typeName: "string",
                  templateArgs: [],
                },
              ],
            },
          ],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "env",
        schema: {
          in: "query",
          description: "env",
          type: "string",
          default: "online",
          typeName: "string",
        },
        required: false,
      },
      {
        in: "query",
        name: "namesInput",
        schema: {
          in: "query",
          description: "namesInput",
          type: "array",
          items: {
            type: "string",
            typeName: "string",
          },
          collectionFormat: "multi",
          typeName: "array",
        },
        required: false,
      },
      {
        in: "query",
        name: "popCodeInput",
        schema: {
          in: "query",
          description: "popCodeInput",
          type: "string",
          typeName: "string",
        },
        required: false,
      },
      {
        in: "query",
        name: "versionInput",
        schema: {
          in: "query",
          description: "versionInput",
          type: "string",
          typeName: "string",
        },
        required: false,
      },
    ],
  },
  remote: {
    description: "将数据同步至旧ApiSpec应用",
    name: "syncApiSpec",
    method: "get",
    path: "/api/v1/convert/{apiGroupUuid}/syncApiSpec",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "ResultDTO",
          templateArgs: [
            {
              typeName: "Map",
              templateArgs: [
                {
                  typeName: "string",
                  templateArgs: [],
                },
                {
                  typeName: "string",
                  templateArgs: [],
                },
              ],
            },
          ],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "env",
        schema: {
          in: "query",
          description: "env",
          type: "string",
          default: "online",
          typeName: "string",
        },
        required: false,
      },
      {
        in: "query",
        name: "names",
        schema: {
          in: "query",
          description: "names",
          type: "array",
          items: {
            type: "string",
            typeName: "string",
          },
          collectionFormat: "multi",
          typeName: "array",
        },
        required: true,
      },
      {
        in: "query",
        name: "popCode",
        schema: {
          in: "query",
          description: "popCode",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "version",
        schema: {
          in: "query",
          description: "version",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
    ],
  },
};
const getGrayRelease = {
  local: {
    description: "查询产品下所有API灰度监控地址",
    name: "getGrayRelease",
    method: "get",
    path: "/gray/v1/monitor/product",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "ResponseEntity",
          templateArgs: [],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "apiGroupUuid",
        schema: {
          in: "query",
          description: "apiGroupUuid",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "env",
        schema: {
          in: "query",
          description: "env",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "processId",
        schema: {
          in: "query",
          description: "processId",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "projectUuid",
        schema: {
          in: "query",
          description: "projectUuid",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "regionId",
        schema: {
          in: "query",
          description: "regionId",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
    ],
  },
  remote: {
    description: "查询产品下所有API灰度监控地址",
    name: "getGrayRelease",
    method: "get",
    path: "/gray/v1/monitor/product",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "ResponseEntity",
          templateArgs: [],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "apiGroupUuid",
        schema: {
          in: "query",
          description: "apiGroupUuid",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "env",
        schema: {
          in: "query",
          description: "env",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "processId",
        schema: {
          in: "query",
          description: "processId",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "projectUuid",
        schema: {
          in: "query",
          description: "projectUuid",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
      {
        in: "query",
        name: "regionId",
        schema: {
          in: "query",
          description: "regionId",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
    ],
  },
} as any;

const queryTask = {
  local: {
    description: "轮训任务状态",
    name: "queryTask",
    method: "get",
    path: "/api/v1/hozComponent/product/govern/task/query",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "Result",
          templateArgs: [
            {
              typeName: "ProductValidateTaskDTO",
              templateArgs: [],
            },
          ],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "taskId",
        schema: {
          in: "query",
          description: "taskId",
          type: "string",
          typeName: "string",
        },
        required: true,
      },
    ],
  },
  remote: {
    description: "轮询任务",
    name: "queryTask",
    method: "get",
    path: "/api/v1/hozComponent/ram/access/task/query",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "Result",
          templateArgs: [
            {
              typeName: "ProductValidateTaskDTO",
              templateArgs: [],
            },
          ],
          isDefsType: true,
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: false,
    parameters: [
      {
        in: "query",
        name: "taskId",
        schema: {
          in: "query",
          description: "taskId",
          type: "string",
          typeName: "string",
        },
        required: false,
      },
    ],
  },
} as any;
const skipchangeFree = {
  local: {
    consumes: ["application/json"],
    description: "跳过changeFree",
    name: "skipchangeFree",
    method: "post",
    path: "/api/v1release/management/orgs/{orgUuid}/skipchangeFree",
    responses: {
      "200": {
        description: "OK2",
        schema: {
          typeName: "ResultDTO",
          templateArgs: [
            {
              typeName: "void",
              templateArgs: [],
            },
          ],
          isDefsType: true,
        },
      },
      "201": {
        description: "Created",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: true,
    parameters: [
      {
        in: "body",
        name: "branchIds",
        schema: {
          in: "body",
          description: "branchIds",
          type: "array",
          items: {
            type: "integer",
            format: "int64",
            typeName: "integer",
          },
          typeName: "array",
        },
        required: true,
      },
    ],
  },
  remote: {
    consumes: ["application/json"],
    description: "跳过changeFree",
    name: "skipchangeFree",
    method: "post",
    path: "/api/v1release/management/orgs/{orgUuid}/skipchangeFree",
    responses: {
      "200": {
        description: "OK",
        schema: {
          typeName: "ResultDTO",
          templateArgs: [
            {
              typeName: "void",
              templateArgs: [],
            },
          ],
          isDefsType: true,
        },
      },
      "201": {
        description: "Created",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "401": {
        description: "Unauthorized",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "403": {
        description: "Forbidden",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
      "404": {
        description: "Not Found",
        schema: {
          templateIndex: -1,
          templateArgs: [],
        },
      },
    },
    deprecated: true,
    parameters: [
      {
        in: "body",
        name: "releaseBranchesDTO",
        schema: {
          typeName: "ReleaseBranchesOfPopCodeDTO",
          templateArgs: [],
          isDefsType: true,
        },
        required: true,
      },
    ],
  },
} as any;

const result1 = diffApi(syncApiSpec.local as any, syncApiSpec.remote as any);
const result2 = diffApi(getGrayRelease.local, getGrayRelease.remote);
const result3 = diffApi(queryTask.local, queryTask.remote);
const result4 = diffApi(skipchangeFree.local, skipchangeFree.remote);
console.log(result1, result2, result3, result4);
debugger;
