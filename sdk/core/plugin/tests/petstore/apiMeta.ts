export const apiMeta = {
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
      pathParams: null,
      queryParams: ["status"],
      bodyParams: null
    },

    "pet/findPetsByTags": {
      method: "GET",
      path: "/pet/findByTags",
      pathParams: null,
      queryParams: ["tags"],
      bodyParams: null
    },

    "pet/getPetById": {
      method: "GET",
      path: "/pet/{petId}",
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: null
    },

    "pet/deletePet": {
      method: "DELETE",
      path: "/pet/{petId}",
      pathParams: ["petId"],
      queryParams: null,
      bodyParams: null
    },

    "pet/updatePetWithForm": {
      method: "POST",
      path: "/pet/{petId}",
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
      pathParams: null,
      queryParams: null,
      bodyParams: null
    },

    "store/placeOrder": {
      method: "POST",
      path: "/store/order",
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
      pathParams: ["orderId"],
      queryParams: null,
      bodyParams: null
    },

    "store/deleteOrder": {
      method: "DELETE",
      path: "/store/order/{orderId}",
      pathParams: ["orderId"],
      queryParams: null,
      bodyParams: null
    },

    "user/createUsersWithListInput": {
      method: "POST",
      path: "/user/createWithList",
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
      pathParams: ["username"],
      queryParams: null,
      bodyParams: null
    },

    "user/deleteUser": {
      method: "DELETE",
      path: "/user/{username}",
      pathParams: ["username"],
      queryParams: null,
      bodyParams: null
    },

    "user/updateUser": {
      method: "PUT",
      path: "/user/{username}",
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
      pathParams: null,
      queryParams: ["username", "password"],
      bodyParams: null
    },

    "user/logoutUser": {
      method: "GET",
      path: "/user/logout",
      pathParams: null,
      queryParams: null,
      bodyParams: null
    },

    "user/createUsersWithArrayInput": {
      method: "POST",
      path: "/user/createWithArray",
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
      pathParams: null,
      queryParams: null,
      bodyParams: {
        contentType: "application/json",
        canMerge: false
      }
    }
  }
} as const;

export type ApiMeta = typeof apiMeta;
