export const specMeta = {
  name: "Swagger Petstore",
  hasTags: true,
  url: [
    {
      url: "petstore.swagger.io/v2"
    }
  ],
  apis: {
    "pet/uploadFile": {
      method: "POST",
      path: "/pet/{petId}/uploadImage",
      consumes: ["multipart/form-data"],
      produces: ["application/json"],
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: {
        contentType: "multipart/form-data",
        canMerge: false
      }
    },

    "pet/updatePet": {
      method: "PUT",
      path: "/pet",
      consumes: ["application/json","application/xml"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "pet/addPet": {
      method: "POST",
      path: "/pet",
      consumes: ["application/json","application/xml"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "pet/findPetsByStatus": {
      method: "GET",
      path: "/pet/findByStatus",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: ["status"],
      bodyParams: null
    },

    "pet/findPetsByTags": {
      method: "GET",
      path: "/pet/findByTags",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: ["tags"],
      bodyParams: null
    },

    "pet/getPetById": {
      method: "GET",
      path: "/pet/{petId}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: null
    },

    "pet/deletePet": {
      method: "DELETE",
      path: "/pet/{petId}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: null
    },

    "pet/updatePetWithForm": {
      method: "POST",
      path: "/pet/{petId}",
      consumes: ["application/x-www-form-urlencoded"],
      produces: ["application/json","application/xml"],
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: {
        contentType: "application/x-www-form-urlencoded",
        canMerge: false
      }
    },

    "store/getInventory": {
      method: "GET",
      path: "/store/inventory",
      consumes: [],
      produces: ["application/json"],
      pathParams: null,
      queryParams: null,
      bodyParams: null
    },

    "store/placeOrder": {
      method: "POST",
      path: "/store/order",
      consumes: ["application/json"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "store/getOrderById": {
      method: "GET",
      path: "/store/order/{orderId}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["orderId"],
      queryParams: null,
      bodyParams: null
    },

    "store/deleteOrder": {
      method: "DELETE",
      path: "/store/order/{orderId}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["orderId"],
      queryParams: null,
      bodyParams: null
    },

    "user/createUsersWithListInput": {
      method: "POST",
      path: "/user/createWithList",
      consumes: ["application/json"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "user/getUserByName": {
      method: "GET",
      path: "/user/{username}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["username"],
      queryParams: null,
      bodyParams: null
    },

    "user/deleteUser": {
      method: "DELETE",
      path: "/user/{username}",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: ["username"],
      queryParams: null,
      bodyParams: null
    },

    "user/updateUser": {
      method: "PUT",
      path: "/user/{username}",
      consumes: ["application/json"],
      produces: ["application/json","application/xml"],
      pathParams: ["username"],
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "user/loginUser": {
      method: "GET",
      path: "/user/login",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: ["username", "password"],
      bodyParams: null
    },

    "user/logoutUser": {
      method: "GET",
      path: "/user/logout",
      consumes: [],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: null
    },

    "user/createUsersWithArrayInput": {
      method: "POST",
      path: "/user/createWithArray",
      consumes: ["application/json"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    },

    "user/createUser": {
      method: "POST",
      path: "/user",
      consumes: ["application/json"],
      produces: ["application/json","application/xml"],
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    }
  }
} as const;
