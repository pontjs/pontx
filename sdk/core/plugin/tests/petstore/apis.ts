/**
 * @author pontx-generator
 * @description API 类型定义
 */

import type * as schemas from './schemas';

// ============ pet 模块 ============

export declare namespace pet {
  export type PetFindPetsByStatusParams = {
    /** Status values that need to be considered for filter */
    status: Array<'available' | 'pending' | 'sold'>;
  };

  export type PetFindPetsByTagsParams = {
    /** Tags to filter by */
    tags: Array<string>;
  };

  export type PetUploadFileBody = {
    /** Additional data to pass to server */
    additionalMetadata?: string;
    /** file to upload */
    file?: File;
  };

  export type PetUpdatePetWithFormBody = {
    /** Updated name of the pet */
    name?: string;
    /** Updated status of the pet */
    status?: string;
  };

}

export type pet = {
  /**
   * uploads an image
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  uploadFile: (
    /** ID of pet to update */
    petId: number,
    body: pet.PetUploadFileBody,
    requestInit?: RequestInit,
  ) => Promise<schemas.ApiResponse>;

  /**
   * Update an existing pet
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  updatePet: (
    /** Request body */
    body: schemas.Pet,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Add a new pet to the store
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  addPet: (
    /** Request body */
    body: schemas.Pet,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Finds Pets by status
   *
   * Multiple status values can be provided with comma separated strings
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  findPetsByStatus: (
    params: pet.PetFindPetsByStatusParams,
    requestInit?: RequestInit,
  ) => Promise<Array<schemas.Pet>>;

  /**
   * Finds Pets by tags
   *
   * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  findPetsByTags: (
    params: pet.PetFindPetsByTagsParams,
    requestInit?: RequestInit,
  ) => Promise<Array<schemas.Pet>>;

  /**
   * Find pet by ID
   *
   * Returns a single pet
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  getPetById: (
    /** ID of pet to return */
    petId: number,
    requestInit?: RequestInit,
  ) => Promise<schemas.Pet>;

  /**
   * Deletes a pet
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  deletePet: (
    /** Pet id to delete */
    petId: number,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Updates a pet in the store with form data
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  updatePetWithForm: (
    /** ID of pet that needs to be updated */
    petId: number,
    body: pet.PetUpdatePetWithFormBody,
    requestInit?: RequestInit,
  ) => Promise<any>;

};

// ============ store 模块 ============

export type store = {
  /**
   * Returns pet inventories by status
   *
   * Returns a map of status codes to quantities
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  getInventory: (
    requestInit?: RequestInit,
  ) => Promise<Record<string, any>>;

  /**
   * Place an order for a pet
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  placeOrder: (
    /** Request body */
    body: schemas.Order,
    requestInit?: RequestInit,
  ) => Promise<schemas.Order>;

  /**
   * Find purchase order by ID
   *
   * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  getOrderById: (
    /** ID of pet that needs to be fetched */
    orderId: number,
    requestInit?: RequestInit,
  ) => Promise<schemas.Order>;

  /**
   * Delete purchase order by ID
   *
   * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  deleteOrder: (
    /** ID of the order that needs to be deleted */
    orderId: number,
    requestInit?: RequestInit,
  ) => Promise<any>;

};

// ============ user 模块 ============

export declare namespace user {
  export type UserLoginUserParams = {
    /** The user name for login */
    username: string;
    /** The password for login in clear text */
    password: string;
  };

}

export type user = {
  /**
   * Creates list of users with given input array
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  createUsersWithListInput: (
    /** List of user object */
    body: Array<schemas.User>,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Get user by user name
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  getUserByName: (
    /** The name that needs to be fetched. Use user1 for testing.  */
    username: string,
    requestInit?: RequestInit,
  ) => Promise<schemas.User>;

  /**
   * Delete user
   *
   * This can only be done by the logged in user.
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  deleteUser: (
    /** The name that needs to be deleted */
    username: string,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Updated user
   *
   * This can only be done by the logged in user.
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  updateUser: (
    /** name that need to be updated */
    username: string,
    /** Request body */
    body: schemas.User,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Logs user into the system
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  loginUser: (
    params: user.UserLoginUserParams,
    requestInit?: RequestInit,
  ) => Promise<string>;

  /**
   * Logs out current logged in user session
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  logoutUser: (
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Creates list of users with given input array
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  createUsersWithArrayInput: (
    /** List of user object */
    body: Array<schemas.User>,
    requestInit?: RequestInit,
  ) => Promise<any>;

  /**
   * Create user
   *
   * This can only be done by the logged in user.
   *
   * @example
   * ```ts
   * // TODO: Add example
   * ```
   */
  createUser: (
    /** Request body */
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
