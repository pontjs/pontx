type ObjectMap<Key extends string | number | symbol = any, Value = any> = {
  [key in Key]: Value;
};

export namespace defs {
  export type ApiResponse = {
    code?: number;
    message?: string;
    type?: string;
  }

  export type Category = {
    id?: number;
    name?: string;
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
    /** Everything about your Pets */
  export namespace pet {
    /**
     * @path: /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    export namespace uploadFile {
      export type Params = {
        /** ID of pet to update */
        petId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = defs.ApiResponse;
    };

    /**
     * @path: /pet
     * @summary: Update an existing pet
     */
    export namespace updatePet {
      export type Params = {};
      export type bodyParams = defs.Pet;
      export type APIReponse = any;
    };

    /**
     * @path: /pet
     * @summary: Add a new pet to the store
     */
    export namespace addPet {
      export type Params = {};
      export type bodyParams = defs.Pet;
      export type APIReponse = any;
    };

    /**
     * @path: /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    export namespace findPetsByStatus {
      export type Params = {
        /** Status values that need to be considered for filter */
        status: Array<'available' | 'pending' | 'sold'>;
      };
      export type bodyParams = undefined;
      export type APIReponse = Array<defs.Pet>;
    };

    /**
     * @path: /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     * @deprecated
     */
    export namespace findPetsByTags {
      export type Params = {
        /** Tags to filter by */
        tags: Array<string>;
      };
      export type bodyParams = undefined;
      export type APIReponse = Array<defs.Pet>;
    };

    /**
     * @path: /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    export namespace getPetById {
      export type Params = {
        /** ID of pet to return */
        petId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = defs.Pet;
    };

    /**
     * @path: /pet/{petId}
     * @summary: Deletes a pet
     */
    export namespace deletePet {
      export type Params = {
        /** Pet id to delete */
        petId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = any;
    };

    /**
     * @path: /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    export namespace updatePetWithForm {
      export type Params = {
        /** ID of pet that needs to be updated */
        petId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = any;
    };
  }

  /** Access to Petstore orders */
  export namespace store {
    /**
     * @path: /store/order
     * @summary: Place an order for a pet
     */
    export namespace placeOrder {
      export type Params = {};
      export type bodyParams = defs.Order;
      export type APIReponse = defs.Order;
    };

    /**
     * @path: /store/order/{orderId}
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     * @summary: Find purchase order by ID
     */
    export namespace getOrderById {
      export type Params = {
        /** ID of pet that needs to be fetched */
        orderId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = defs.Order;
    };

    /**
     * @path: /store/order/{orderId}
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     * @summary: Delete purchase order by ID
     */
    export namespace deleteOrder {
      export type Params = {
        /** ID of the order that needs to be deleted */
        orderId: number;
      };
      export type bodyParams = undefined;
      export type APIReponse = any;
    };

    /**
     * @path: /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    export namespace getInventory {
      export type Params = {};
      export type bodyParams = undefined;
      export type APIReponse = object;
    };
  }

  /** Operations about user */
  export namespace user {
    /**
     * @path: /user/createWithArray
     * @summary: Creates list of users with given input array
     */
    export namespace createUsersWithArrayInput {
      export type Params = {};
      export type bodyParams = Array<defs.User>;
      export type APIReponse = any;
    };

    /**
     * @path: /user/createWithList
     * @summary: Creates list of users with given input array
     */
    export namespace createUsersWithListInput {
      export type Params = {};
      export type bodyParams = Array<defs.User>;
      export type APIReponse = any;
    };

    /**
     * @path: /user/{username}
     * @summary: Get user by user name
     */
    export namespace getUserByName {
      export type Params = {
        /** The name that needs to be fetched. Use user1 for testing.  */
        username: string;
      };
      export type bodyParams = undefined;
      export type APIReponse = defs.User;
    };

    /**
     * @path: /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    export namespace deleteUser {
      export type Params = {
        /** The name that needs to be deleted */
        username: string;
      };
      export type bodyParams = undefined;
      export type APIReponse = any;
    };

    /**
     * @path: /user/{username}
     * This can only be done by the logged in user.
     * @summary: Updated user
     */
    export namespace updateUser {
      export type Params = {
        /** name that need to be updated */
        username: string;
      };
      export type bodyParams = defs.User;
      export type APIReponse = any;
    };

    /**
     * @path: /user/login
     * @summary: Logs user into the system
     */
    export namespace loginUser {
      export type Params = {
        /** The user name for login */
        username: string;
        /** The password for login in clear text */
        password: string;
      };
      export type bodyParams = undefined;
      export type APIReponse = string;
    };

    /**
     * @path: /user/logout
     * @summary: Logs out current logged in user session
     */
    export namespace logoutUser {
      export type Params = {};
      export type bodyParams = undefined;
      export type APIReponse = any;
    };

    /**
     * @path: /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    export namespace createUser {
      export type Params = {};
      export type bodyParams = defs.User;
      export type APIReponse = any;
    };
  }
}
