const specMeta = {
  "apis": {
    "pet": {
      "addPet": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "apiName": "addPet",
        "path": "/pet",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "deletePet": {
        "method": "delete",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "deletePet",
        "path": "/pet/{petId}",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "findPetsByStatus": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "findPetsByStatus",
        "path": "/pet/findByStatus",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "findPetsByTags": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "findPetsByTags",
        "path": "/pet/findByTags",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "getPetById": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "getPetById",
        "path": "/pet/{petId}",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "updatePet": {
        "method": "put",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "apiName": "updatePet",
        "path": "/pet",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "updatePetWithForm": {
        "method": "post",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "updatePetWithForm",
        "path": "/pet/{petId}",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "uploadFile": {
        "method": "post",
        "hasBody": true,
        "hasParams": true,
        "consumes": [
          "application/octet-stream"
        ],
        "apiName": "uploadFile",
        "path": "/pet/{petId}/uploadImage",
        "specName": "petstore",
        "controllerName": "pet"
      }
    },
    "store": {
      "deleteOrder": {
        "method": "delete",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "deleteOrder",
        "path": "/store/order/{orderId}",
        "specName": "petstore",
        "controllerName": "store"
      },
      "getInventory": {
        "method": "get",
        "hasBody": false,
        "hasParams": false,
        "consumes": [],
        "apiName": "getInventory",
        "path": "/store/inventory",
        "specName": "petstore",
        "controllerName": "store"
      },
      "getOrderById": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "getOrderById",
        "path": "/store/order/{orderId}",
        "specName": "petstore",
        "controllerName": "store"
      },
      "placeOrder": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "apiName": "placeOrder",
        "path": "/store/order",
        "specName": "petstore",
        "controllerName": "store"
      }
    },
    "user": {
      "createUser": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "apiName": "createUser",
        "path": "/user",
        "specName": "petstore",
        "controllerName": "user"
      },
      "createUsersWithListInput": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "apiName": "createUsersWithListInput",
        "path": "/user/createWithList",
        "specName": "petstore",
        "controllerName": "user"
      },
      "deleteUser": {
        "method": "delete",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "deleteUser",
        "path": "/user/{username}",
        "specName": "petstore",
        "controllerName": "user"
      },
      "getUserByName": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "getUserByName",
        "path": "/user/{username}",
        "specName": "petstore",
        "controllerName": "user"
      },
      "loginUser": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "consumes": [],
        "apiName": "loginUser",
        "path": "/user/login",
        "specName": "petstore",
        "controllerName": "user"
      },
      "logoutUser": {
        "method": "get",
        "hasBody": false,
        "hasParams": false,
        "consumes": [],
        "apiName": "logoutUser",
        "path": "/user/logout",
        "specName": "petstore",
        "controllerName": "user"
      },
      "updateUser": {
        "method": "put",
        "hasBody": true,
        "hasParams": true,
        "consumes": [
          "application/json"
        ],
        "apiName": "updateUser",
        "path": "/user/{username}",
        "specName": "petstore",
        "controllerName": "user"
      }
    }
  },
  "hasController": true,
  "specName": "petstore",
  "description": "This is a sample Pet Store Server based on the OpenAPI 3.0 specification.  You can find out more about\nSwagger at [http://swagger.io](http://swagger.io). In the third iteration of the pet store, we've switched to the design first approach!\nYou can now help us improve the API whether it's by making changes to the definition itself or to the code.\nThat way, with time, we can improve the API in general, and expose some of the new features in OAS3.\n\nSome useful links:\n- [The Pet Store repository](https://github.com/swagger-api/swagger-petstore)\n- [The source API definition for the Pet Store](https://github.com/swagger-api/swagger-petstore/blob/master/src/main/resources/openapi.yaml)",
  "basePath": "/api/v3",
  "host": "petstore3.swagger.io"
};
export default specMeta;