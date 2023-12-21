import type { API, defs } from './type.d.ts';

type OptionalBodyRequest<Params, BodyParams, Response> = BodyParams extends null | undefined
  ? (params: Params, options?: RequestInit) => Promise<Response>
  : (params: Params, options?: { body: BodyParams } & Omit<RequestInit, "body" | "params">) => Promise<Response>;

type RequestMethods<Params = any, BodyParams = any, Response = any> = {
  request: OptionalBodyRequest<Params, BodyParams, Response>;
};

export type APIs = {
  /** Everything about your Pets */
  pet: {
    /**
     * @path: /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    uploadFile: RequestMethods<API.pet.uploadFile.Params, API.pet.uploadFile.bodyParams, API.pet.uploadFile.APIReponse>;

    /**
     * @path: /pet
     * @summary: Update an existing pet
     */
    updatePet: RequestMethods<API.pet.updatePet.Params, API.pet.updatePet.bodyParams, API.pet.updatePet.APIReponse>;

    /**
     * @path: /pet
     * @summary: Add a new pet to the store
     */
    addPet: RequestMethods<API.pet.addPet.Params, API.pet.addPet.bodyParams, API.pet.addPet.APIReponse>;

    /**
     * @path: /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    findPetsByStatus: RequestMethods<API.pet.findPetsByStatus.Params, API.pet.findPetsByStatus.bodyParams, API.pet.findPetsByStatus.APIReponse>;

    /**
     * @path: /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     * @deprecated
     */
    findPetsByTags: RequestMethods<API.pet.findPetsByTags.Params, API.pet.findPetsByTags.bodyParams, API.pet.findPetsByTags.APIReponse>;

    /**
     * @path: /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    getPetById: RequestMethods<API.pet.getPetById.Params, API.pet.getPetById.bodyParams, API.pet.getPetById.APIReponse>;

    /**
     * @path: /pet/{petId}
     * @summary: Deletes a pet
     */
    deletePet: RequestMethods<API.pet.deletePet.Params, API.pet.deletePet.bodyParams, API.pet.deletePet.APIReponse>;

    /**
     * @path: /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    updatePetWithForm: RequestMethods<API.pet.updatePetWithForm.Params, API.pet.updatePetWithForm.bodyParams, API.pet.updatePetWithForm.APIReponse>;
  }

  /** Access to Petstore orders */
  store: {
    /**
     * @path: /store/order
     * @summary: Place an order for a pet
     */
    placeOrder: RequestMethods<API.store.placeOrder.Params, API.store.placeOrder.bodyParams, API.store.placeOrder.APIReponse>;

    /**
     * @path: /store/order/{orderId}
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     * @summary: Find purchase order by ID
     */
    getOrderById: RequestMethods<API.store.getOrderById.Params, API.store.getOrderById.bodyParams, API.store.getOrderById.APIReponse>;

    /**
     * @path: /store/order/{orderId}
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     * @summary: Delete purchase order by ID
     */
    deleteOrder: RequestMethods<API.store.deleteOrder.Params, API.store.deleteOrder.bodyParams, API.store.deleteOrder.APIReponse>;

    /**
     * @path: /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    getInventory: RequestMethods<API.store.getInventory.Params, API.store.getInventory.bodyParams, API.store.getInventory.APIReponse>;
  }

  /** Operations about user */
  user: {
    /**
     * @path: /user/createWithArray
     * @summary: Creates list of users with given input array
     */
    createUsersWithArrayInput: RequestMethods<API.user.createUsersWithArrayInput.Params, API.user.createUsersWithArrayInput.bodyParams, API.user.createUsersWithArrayInput.APIReponse>;

    /**
     * @path: /user/createWithList
     * @summary: Creates list of users with given input array
     */
    createUsersWithListInput: RequestMethods<API.user.createUsersWithListInput.Params, API.user.createUsersWithListInput.bodyParams, API.user.createUsersWithListInput.APIReponse>;

    /**
     * @path: /user/{username}
     * @summary: Get user by user name
     */
    getUserByName: RequestMethods<API.user.getUserByName.Params, API.user.getUserByName.bodyParams, API.user.getUserByName.APIReponse>;

    /**
     * @path: /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    deleteUser: RequestMethods<API.user.deleteUser.Params, API.user.deleteUser.bodyParams, API.user.deleteUser.APIReponse>;

    /**
     * @path: /user/{username}
     * This can only be done by the logged in user.
     * @summary: Updated user
     */
    updateUser: RequestMethods<API.user.updateUser.Params, API.user.updateUser.bodyParams, API.user.updateUser.APIReponse>;

    /**
     * @path: /user/login
     * @summary: Logs user into the system
     */
    loginUser: RequestMethods<API.user.loginUser.Params, API.user.loginUser.bodyParams, API.user.loginUser.APIReponse>;

    /**
     * @path: /user/logout
     * @summary: Logs out current logged in user session
     */
    logoutUser: RequestMethods<API.user.logoutUser.Params, API.user.logoutUser.bodyParams, API.user.logoutUser.APIReponse>;

    /**
     * @path: /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    createUser: RequestMethods<API.user.createUser.Params, API.user.createUser.bodyParams, API.user.createUser.APIReponse>;
  }
}