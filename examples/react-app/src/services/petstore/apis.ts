import type * as schemas from "./schemas";

export type APIs = {
  /** Everything about your Pets */
  pet: {
    /**
     * POST /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    uploadFile: {
      params: {
        petId: any;
      };
      method: "POST";
      bodyParams: undefined;
      Response: schemas.ApiResponse;
    };

    /**
     * PUT /pet
     * @summary: Update an existing pet
     */
    updatePet: {
      params: {};
      method: "PUT";
      bodyParams: schemas.Pet;
      Response: any;
    };

    /**
     * POST /pet
     * @summary: Add a new pet to the store
     */
    addPet: {
      params: {};
      method: "POST";
      bodyParams: schemas.Pet;
      Response: any;
    };

    /**
     * GET /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    findPetsByStatus: {
      params: {
        status: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: Array<schemas.Pet>;
    };

    /**
     * GET /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     * @deprecated
     */
    findPetsByTags: {
      params: {
        tags: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: Array<schemas.Pet>;
    };

    /**
     * GET /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    getPetById: {
      params: {
        petId: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: schemas.Pet;
    };

    /**
     * DELETE /pet/{petId}
     * @summary: Deletes a pet
     */
    deletePet: {
      params: {
        petId: any;
      };
      method: "DELETE";
      bodyParams: undefined;
      Response: any;
    };

    /**
     * POST /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    updatePetWithForm: {
      params: {
        petId: any;
      };
      method: "POST";
      bodyParams: undefined;
      Response: any;
    };
  };

  /** Access to Petstore orders */
  store: {
    /**
     * GET /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    getInventory: {
      params: {};
      method: "GET";
      bodyParams: undefined;
      Response: Record<any, number>;
    };

    /**
     * POST /store/order
     * @summary: Place an order for a pet
     */
    placeOrder: {
      params: {};
      method: "POST";
      bodyParams: schemas.Order;
      Response: schemas.Order;
    };

    /**
     * GET /store/order/{orderId}
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     * @summary: Find purchase order by ID
     */
    getOrderById: {
      params: {
        orderId: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: schemas.Order;
    };

    /**
     * DELETE /store/order/{orderId}
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     * @summary: Delete purchase order by ID
     */
    deleteOrder: {
      params: {
        orderId: any;
      };
      method: "DELETE";
      bodyParams: undefined;
      Response: any;
    };
  };

  /** Operations about user */
  user: {
    /**
     * POST /user/createWithList
     * @summary: Creates list of users with given input array
     */
    createUsersWithListInput: {
      params: {};
      method: "POST";
      bodyParams: Array<schemas.User>;
      Response: any;
    };

    /**
     * GET /user/{username}
     * @summary: Get user by user name
     */
    getUserByName: {
      params: {
        username: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: schemas.User;
    };

    /**
     * DELETE /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    deleteUser: {
      params: {
        username: any;
      };
      method: "DELETE";
      bodyParams: undefined;
      Response: any;
    };

    /**
     * PUT /user/{username}
     * This can only be done by the logged in user.
     * @summary: Updated user
     */
    updateUser: {
      params: {
        username: any;
      };
      method: "PUT";
      bodyParams: schemas.User;
      Response: any;
    };

    /**
     * GET /user/login
     * @summary: Logs user into the system
     */
    loginUser: {
      params: {
        username: any;
        password: any;
      };
      method: "GET";
      bodyParams: undefined;
      Response: string;
    };

    /**
     * GET /user/logout
     * @summary: Logs out current logged in user session
     */
    logoutUser: {
      params: {};
      method: "GET";
      bodyParams: undefined;
      Response: any;
    };

    /**
     * POST /user/createWithArray
     * @summary: Creates list of users with given input array
     */
    createUsersWithArrayInput: {
      params: {};
      method: "POST";
      bodyParams: Array<schemas.User>;
      Response: any;
    };

    /**
     * POST /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    createUser: {
      params: {};
      method: "POST";
      bodyParams: schemas.User;
      Response: any;
    };
  };
};
