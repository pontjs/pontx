export const specMeta = {
  "name": "petstore",
  "url": [
    {
      "url": "petstore.swagger.io/v2"
    }
  ],
  "apis": {
    "pet/uploadFile": {
      "method": "POST",
      "hasBody": false,
      "hasParams": true,
      "consumes": [
        "multipart/form-data"
      ],
      "produces": [
        "application/json"
      ],
      "path": "/pet/{petId}/uploadImage"
    },
    "pet/updatePet": {
      "method": "PUT",
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
      "path": "/pet"
    },
    "pet/addPet": {
      "method": "POST",
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
      "path": "/pet"
    },
    "pet/findPetsByStatus": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/findByStatus"
    },
    "pet/findPetsByTags": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/findByTags"
    },
    "pet/getPetById": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/{petId}"
    },
    "pet/deletePet": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/{petId}"
    },
    "pet/updatePetWithForm": {
      "method": "POST",
      "hasBody": false,
      "hasParams": true,
      "consumes": [
        "application/x-www-form-urlencoded"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/{petId}"
    },
    "store/getInventory": {
      "method": "GET",
      "hasBody": false,
      "hasParams": false,
      "produces": [
        "application/json"
      ],
      "path": "/store/inventory"
    },
    "store/placeOrder": {
      "method": "POST",
      "hasBody": true,
      "hasParams": false,
      "consumes": [
        "application/json"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/store/order"
    },
    "store/getOrderById": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/store/order/{orderId}"
    },
    "store/deleteOrder": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/store/order/{orderId}"
    },
    "user/createUsersWithListInput": {
      "method": "POST",
      "hasBody": true,
      "hasParams": false,
      "consumes": [
        "application/json"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/createWithList"
    },
    "user/getUserByName": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/{username}"
    },
    "user/deleteUser": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/{username}"
    },
    "user/updateUser": {
      "method": "PUT",
      "hasBody": true,
      "hasParams": true,
      "consumes": [
        "application/json"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/{username}"
    },
    "user/loginUser": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/login"
    },
    "user/logoutUser": {
      "method": "GET",
      "hasBody": false,
      "hasParams": false,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/logout"
    },
    "user/createUsersWithArrayInput": {
      "method": "POST",
      "hasBody": true,
      "hasParams": false,
      "consumes": [
        "application/json"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/createWithArray"
    },
    "user/createUser": {
      "method": "POST",
      "hasBody": true,
      "hasParams": false,
      "consumes": [
        "application/json"
      ],
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user"
    }
  },
  "hasTags": true
};