/**
 * @author pontx-generator
 * @description API 类型定义
 */

import type * as schemas from './schemas';

// ============ pet 模块 ============

export declare namespace pet {
  export type FindPetsByStatusParams = {
    /**
     * @description Status values that need to be considered for filter
     */
    status: Array<'available' | 'pending' | 'sold'>;
  };

  export type FindPetsByTagsParams = {
    /**
     * @description Tags to filter by
     */
    tags: Array<string>;
  };

  export type UploadFileBody = {
    /**
     * @description Additional data to pass to server
     */
    additionalMetadata?: string;
    /**
     * @description file to upload
     */
    file?: any;
  };

  export type UpdatePetWithFormBody = {
    /**
     * @description Updated name of the pet
     */
    name?: string;
    /**
     * @description Updated status of the pet
     */
    status?: string;
  };

}

export type pet = {
  /**
   * POST /pet/{petId}/uploadImage
   * @summary: uploads an image
   */
  uploadFile: (
    /**
     * @description ID of pet to update
     */
    petId: number,
    body: pet.UploadFileBody,
    requestInit?: RequestInit,
  ) => Promise<schemas.ApiResponse>;

  /**
   * PUT /pet
   * @summary: Update an existing pet
   */
  updatePet: (
    body: schemas.Pet,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * POST /pet
   * @summary: Add a new pet to the store
   */
  addPet: (
    body: schemas.Pet,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * GET /pet/findByStatus
   * Multiple status values can be provided with comma separated strings
   * @summary: Finds Pets by status
   */
  findPetsByStatus: (
    params: pet.FindPetsByStatusParams,
    requestInit?: RequestInit,
  ) => Promise<Array<schemas.Pet>>;

  /**
   * GET /pet/findByTags
   * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
   * @summary: Finds Pets by tags
   * @deprecated
   */
  findPetsByTags: (
    params: pet.FindPetsByTagsParams,
    requestInit?: RequestInit,
  ) => Promise<Array<schemas.Pet>>;

  /**
   * GET /pet/{petId}
   * Returns a single pet
   * @summary: Find pet by ID
   */
  getPetById: (
    /**
     * @description ID of pet to return
     */
    petId: number,
    requestInit?: RequestInit,
  ) => Promise<schemas.Pet>;

  /**
   * DELETE /pet/{petId}
   * @summary: Deletes a pet
   */
  deletePet: (
    /**
     * @description Pet id to delete
     */
    petId: number,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * POST /pet/{petId}
   * @summary: Updates a pet in the store with form data
   */
  updatePetWithForm: (
    /**
     * @description ID of pet that needs to be updated
     */
    petId: number,
    body: pet.UpdatePetWithFormBody,
    requestInit?: RequestInit,
  ) => Promise<any>;

};

// ============ store 模块 ============

export type store = {
  /**
   * GET /store/inventory
   * Returns a map of status codes to quantities
   * @summary: Returns pet inventories by status
   */
  getInventory: (
    requestInit?: RequestInit,
  ) => Promise<Record<any, number>>;

  /**
   * POST /store/order
   * @summary: Place an order for a pet
   */
  placeOrder: (
    body: schemas.Order,
    requestInit?: RequestInit,
  ) => Promise<schemas.Order>;

  /**
   * GET /store/order/{orderId}
   * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
   * @summary: Find purchase order by ID
   */
  getOrderById: (
    /**
     * @description ID of pet that needs to be fetched
     */
    orderId: number,
    requestInit?: RequestInit,
  ) => Promise<schemas.Order>;

  /**
   * DELETE /store/order/{orderId}
   * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
   * @summary: Delete purchase order by ID
   */
  deleteOrder: (
    /**
     * @description ID of the order that needs to be deleted
     */
    orderId: number,
    requestInit?: RequestInit,
  ) => Promise<any>;

};

// ============ user 模块 ============

export declare namespace user {
  export type LoginUserParams = {
    /**
     * @description The user name for login
     */
    username: string;
    /**
     * @description The password for login in clear text
     */
    password: string;
  };

}

export type user = {
  /**
   * POST /user/createWithList
   * @summary: Creates list of users with given input array
   */
  createUsersWithListInput: (
    /**
     * @description List of user object
     */
    body: Array<schemas.User>,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * GET /user/{username}
   * @summary: Get user by user name
   */
  getUserByName: (
    /**
     * @description The name that needs to be fetched. Use user1 for testing. 
     */
    username: string,
    requestInit?: RequestInit,
  ) => Promise<schemas.User>;

  /**
   * DELETE /user/{username}
   * This can only be done by the logged in user.
   * @summary: Delete user
   */
  deleteUser: (
    /**
     * @description The name that needs to be deleted
     */
    username: string,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * PUT /user/{username}
   * This can only be done by the logged in user.
   * @summary: Updated user
   */
  updateUser: (
    /**
     * @description name that need to be updated
     */
    username: string,
    body: schemas.User,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * GET /user/login
   * @summary: Logs user into the system
   */
  loginUser: (
    params: user.LoginUserParams,
    requestInit?: RequestInit,
  ) => Promise<string>;

  /**
   * GET /user/logout
   * @summary: Logs out current logged in user session
   */
  logoutUser: (
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * POST /user/createWithArray
   * @summary: Creates list of users with given input array
   */
  createUsersWithArrayInput: (
    /**
     * @description List of user object
     */
    body: Array<schemas.User>,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * POST /user
   * This can only be done by the logged in user.
   * @summary: Create user
   */
  createUser: (
    body: schemas.User,
    requestInit?: RequestInit,
  ) => Promise<any>;

};

// ============ API 集合类型 ============

/**
 * API 类型定义
 */
export type APIs = {
  /** pet 模块 */
  pet: pet;
  /** store 模块 */
  store: store;
  /** user 模块 */
  user: user;
};

export declare namespace APIs {
  export { pet };
  export { store };
  export { user };
}
