type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

export namespace defs {
  export type Address = {
    city?: string;
    state?: string;
    street?: string;
    zip?: string;
  }

  export type ApiResponse = {
    code?: number;
    message?: string;
    type?: string;
  }

  export type Category = {
    id?: number;
    name?: string;
  }

  export type Customer = {
    address?: Array<defs.Address>;
    id?: number;
    username?: string;
  }

  export type Order = {
    complete?: boolean;
    id?: number;
    petId?: number;
    quantity?: number;
    shipDate?: string;
    /** Order Status */
    status?: 'placed' | 'approved' | 'delivered';
  }

  export type Pet = {
    category?: defs.Category;
    id?: number;
    name: string;
    photoUrls: Array<string>;
    /** pet status in the store */
    status?: 'available' | 'pending' | 'sold';
    tags?: Array<defs.Tag>;
  }

  export type Tag = {
    id?: number;
    name?: string;
  }

  export type User = {
    email?: string;
    firstName?: string;
    id?: number;
    lastName?: string;
    password?: string;
    phone?: string;
    /** User Status */
    userStatus?: number;
    username?: string;
  }
}

export namespace API {
    export namespace pet {
    /**
     * POST /pet
     * Add a new pet to the store
     * @summary: Add a new pet to the store
     */
    export namespace addPet {
      export type Params = {};
      export type method = 'POST';
      export type bodyParams = defs.Pet;
      export type APIResponse = defs.Pet;
    }

    /**
     * DELETE /pet/{petId}
     * @summary: Deletes a pet
     */
    export namespace deletePet {
      export type Params = {
        /** Pet id to delete */
        petId: number;
      };
      export type method = 'DELETE';
      export type bodyParams = undefined;
      export type APIResponse = any;
    }

    /**
     * GET /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    export namespace findPetsByStatus {
      export type Params = {
        /** Status values that need to be considered for filter */
        status?: 'available' | 'pending' | 'sold';
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = Array<defs.Pet>;
    }

    /**
     * GET /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     */
    export namespace findPetsByTags {
      export type Params = {
        /** Tags to filter by */
        tags?: Array<string>;
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = Array<defs.Pet>;
    }

    /**
     * GET /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    export namespace getPetById {
      export type Params = {
        /** ID of pet to return */
        petId: number;
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = defs.Pet;
    }

    /**
     * PUT /pet
     * Update an existing pet by Id
     * @summary: Update an existing pet
     */
    export namespace updatePet {
      export type Params = {};
      export type method = 'PUT';
      export type bodyParams = defs.Pet;
      export type APIResponse = defs.Pet;
    }

    /**
     * POST /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    export namespace updatePetWithForm {
      export type Params = {
        /** ID of pet that needs to be updated */
        petId: number;
        /** Name of pet that needs to be updated */
        name?: string;
        /** Status of pet that needs to be updated */
        status?: string;
      };
      export type method = 'POST';
      export type bodyParams = undefined;
      export type APIResponse = any;
    }

    /**
     * POST /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    export namespace uploadFile {
      export type Params = {
        /** ID of pet to update */
        petId: number;
        /** Additional Metadata */
        additionalMetadata?: string;
      };
      export type method = 'POST';
      export type bodyParams = string;
      export type APIResponse = defs.ApiResponse;
    }
  }

  export namespace store {
    /**
     * DELETE /store/order/{orderId}
     * For valid response try integer IDs with value < 1000. Anything above 1000 or nonintegers will generate API errors
     * @summary: Delete purchase order by ID
     */
    export namespace deleteOrder {
      export type Params = {
        /** ID of the order that needs to be deleted */
        orderId: number;
      };
      export type method = 'DELETE';
      export type bodyParams = undefined;
      export type APIResponse = any;
    }

    /**
     * GET /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    export namespace getInventory {
      export type Params = {};
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = object;
    }

    /**
     * GET /store/order/{orderId}
     * For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.
     * @summary: Find purchase order by ID
     */
    export namespace getOrderById {
      export type Params = {
        /** ID of order that needs to be fetched */
        orderId: number;
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = defs.Order;
    }

    /**
     * POST /store/order
     * Place a new order in the store
     * @summary: Place an order for a pet
     */
    export namespace placeOrder {
      export type Params = {};
      export type method = 'POST';
      export type bodyParams = defs.Order;
      export type APIResponse = defs.Order;
    }
  }

  export namespace user {
    /**
     * POST /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    export namespace createUser {
      export type Params = {};
      export type method = 'POST';
      export type bodyParams = defs.User;
      export type APIResponse = any;
    }

    /**
     * POST /user/createWithList
     * Creates list of users with given input array
     * @summary: Creates list of users with given input array
     */
    export namespace createUsersWithListInput {
      export type Params = {};
      export type method = 'POST';
      export type bodyParams = Array<defs.User>;
      export type APIResponse = defs.User;
    }

    /**
     * DELETE /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    export namespace deleteUser {
      export type Params = {
        /** The name that needs to be deleted */
        username: string;
      };
      export type method = 'DELETE';
      export type bodyParams = undefined;
      export type APIResponse = any;
    }

    /**
     * GET /user/{username}
     * @summary: Get user by user name
     */
    export namespace getUserByName {
      export type Params = {
        /** The name that needs to be fetched. Use user1 for testing.  */
        username: string;
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = defs.User;
    }

    /**
     * GET /user/login
     * @summary: Logs user into the system
     */
    export namespace loginUser {
      export type Params = {
        /** The user name for login */
        username?: string;
        /** The password for login in clear text */
        password?: string;
      };
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = string;
    }

    /**
     * GET /user/logout
     * @summary: Logs out current logged in user session
     */
    export namespace logoutUser {
      export type Params = {};
      export type method = 'GET';
      export type bodyParams = undefined;
      export type APIResponse = any;
    }

    /**
     * PUT /user/{username}
     * This can only be done by the logged in user.
     * @summary: Update user
     */
    export namespace updateUser {
      export type Params = {
        /** name that needs to be updated */
        username: string;
      };
      export type method = 'PUT';
      export type bodyParams = defs.User;
      export type APIResponse = any;
    }
  }
}
