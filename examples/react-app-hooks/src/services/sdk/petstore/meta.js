const specMeta = {
  "apis": {
    "pet": {
      "addPet": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json",
          "application/xml"
        ],
        "produces": [
          "application/json",
          "application/xml"
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
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "deletePet",
        "path": "/pet/{petId}",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "findPetsByStatus": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "findPetsByStatus",
        "path": "/pet/findByStatus",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "findPetsByTags": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "findPetsByTags",
        "path": "/pet/findByTags",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "getPetById": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
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
          "application/json",
          "application/xml"
        ],
        "produces": [
          "application/json",
          "application/xml"
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
        "consumes": [
          "application/x-www-form-urlencoded"
        ],
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "updatePetWithForm",
        "path": "/pet/{petId}",
        "specName": "petstore",
        "controllerName": "pet"
      },
      "uploadFile": {
        "method": "post",
        "hasBody": false,
        "hasParams": true,
        "consumes": [
          "multipart/form-data"
        ],
        "produces": [
          "application/json"
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
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "deleteOrder",
        "path": "/store/order/{orderId}",
        "specName": "petstore",
        "controllerName": "store"
      },
      "getInventory": {
        "method": "get",
        "hasBody": false,
        "hasParams": false,
        "produces": [
          "application/json"
        ],
        "apiName": "getInventory",
        "path": "/store/inventory",
        "specName": "petstore",
        "controllerName": "store"
      },
      "getOrderById": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
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
        "produces": [
          "application/json",
          "application/xml"
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
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "createUser",
        "path": "/user",
        "specName": "petstore",
        "controllerName": "user"
      },
      "createUsersWithArrayInput": {
        "method": "post",
        "hasBody": true,
        "hasParams": false,
        "consumes": [
          "application/json"
        ],
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "createUsersWithArrayInput",
        "path": "/user/createWithArray",
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
        "produces": [
          "application/json",
          "application/xml"
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
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "deleteUser",
        "path": "/user/{username}",
        "specName": "petstore",
        "controllerName": "user"
      },
      "getUserByName": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "getUserByName",
        "path": "/user/{username}",
        "specName": "petstore",
        "controllerName": "user"
      },
      "loginUser": {
        "method": "get",
        "hasBody": false,
        "hasParams": true,
        "produces": [
          "application/json",
          "application/xml"
        ],
        "apiName": "loginUser",
        "path": "/user/login",
        "specName": "petstore",
        "controllerName": "user"
      },
      "logoutUser": {
        "method": "get",
        "hasBody": false,
        "hasParams": false,
        "produces": [
          "application/json",
          "application/xml"
        ],
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
        "produces": [
          "application/json",
          "application/xml"
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
  "description": "This is a sample server Petstore server.  You can find out more about Swagger at [http://swagger.io](http://swagger.io) or on [irc.freenode.net, #swagger](http://swagger.io/irc/).  For this sample, you can use the api key `special-key` to test the authorization filters.",
  "basePath": "/v2",
  "host": "petstore.swagger.io",
  "securitySchemes": {
    "api_key": {
      "in": "header",
      "name": "api_key",
      "type": "apiKey"
    },
    "petstore_auth": {
      "authorizationUrl": "https://petstore.swagger.io/oauth/authorize",
      "flow": "implicit",
      "scopes": {
        "read:pets": "read your pets",
        "write:pets": "modify pets in your account"
      },
      "type": "oauth2"
    }
  }
};
export default specMeta;