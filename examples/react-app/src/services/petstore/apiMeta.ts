export const specMeta = {
  "name": "petstore",
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
      "path": "/pet/{petId}/uploadImage",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
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
      "path": "/pet",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
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
      "path": "/pet",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
    },
    "pet/findPetsByStatus": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/findByStatus",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
    },
    "pet/findPetsByTags": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/findByTags",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
    },
    "pet/getPetById": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/{petId}",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
    },
    "pet/deletePet": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/pet/{petId}",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
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
      "path": "/pet/{petId}",
      "tag": {
        "name": "pet",
        "description": "Everything about your Pets"
      }
    },
    "store/getInventory": {
      "method": "GET",
      "hasBody": false,
      "hasParams": false,
      "produces": [
        "application/json"
      ],
      "path": "/store/inventory",
      "tag": {
        "name": "store",
        "description": "Access to Petstore orders"
      }
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
      "path": "/store/order",
      "tag": {
        "name": "store",
        "description": "Access to Petstore orders"
      }
    },
    "store/getOrderById": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/store/order/{orderId}",
      "tag": {
        "name": "store",
        "description": "Access to Petstore orders"
      }
    },
    "store/deleteOrder": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/store/order/{orderId}",
      "tag": {
        "name": "store",
        "description": "Access to Petstore orders"
      }
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
      "path": "/user/createWithList",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
    },
    "user/getUserByName": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/{username}",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
    },
    "user/deleteUser": {
      "method": "DELETE",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/{username}",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
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
      "path": "/user/{username}",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
    },
    "user/loginUser": {
      "method": "GET",
      "hasBody": false,
      "hasParams": true,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/login",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
    },
    "user/logoutUser": {
      "method": "GET",
      "hasBody": false,
      "hasParams": false,
      "produces": [
        "application/json",
        "application/xml"
      ],
      "path": "/user/logout",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
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
      "path": "/user/createWithArray",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
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
      "path": "/user",
      "tag": {
        "name": "user",
        "description": "Operations about user"
      }
    }
  },
  "hasTags": true
};