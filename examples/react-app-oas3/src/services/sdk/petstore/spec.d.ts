import type { API, defs } from './type.d.ts';
import { provider } from './request';

type SDKMethods2<Method, Response> = ReturnType<typeof provider.getSDKMethods<Method, Response>>;
type SDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getSDKMethods<Method, Params, Response>>;
type SDKMethods4<Method, Params, BodyParams, Response> = ReturnType<
  typeof provider.getSDKMethods<Method, Params, BodyParams, Response>
>;

type OctetStreamSDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getOctetStreamSDKMethods<Method, Params, Response>>;
type OctetStreamSDKMethods4<Method, Params, BodyParams, Response> = ReturnType<
  typeof provider.getOctetStreamSDKMethods<Method, Params, BodyParams, Response>
>;

type EventStreamSDKMethods2<Method, Response> = ReturnType<typeof provider.getEventStreamSDKMethods<Method, Response>>;
type EventStreamSDKMethods3<Method, Params, Response> = ReturnType<typeof provider.getEventStreamSDKMethods<Method, Params, Response>>;
type EventStreamSDKMethods4<Method, Params, BodyParams, Response> = ReturnType<
  typeof provider.getEventStreamSDKMethods<Method, Params, BodyParams, Response>
>;

export namespace APIs {
  export namespace pet {
    /**
     * POST /pet
     * Add a new pet to the store
     * @summary: Add a new pet to the store
     */
    export const addPet: SDKMethods3<
      API.pet.addPet.method,
      API.pet.addPet.bodyParams,
      API.pet.addPet.APIResponse
    >;

    /**
     * DELETE /pet/{petId}
     * @summary: Deletes a pet
     */
    export const deletePet: SDKMethods3<
      API.pet.deletePet.method,
      API.pet.deletePet.Params,
      API.pet.deletePet.APIResponse
    >;

    /**
     * GET /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    export const findPetsByStatus: SDKMethods3<
      API.pet.findPetsByStatus.method,
      API.pet.findPetsByStatus.Params,
      API.pet.findPetsByStatus.APIResponse
    >;

    /**
     * GET /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     */
    export const findPetsByTags: SDKMethods3<
      API.pet.findPetsByTags.method,
      API.pet.findPetsByTags.Params,
      API.pet.findPetsByTags.APIResponse
    >;

    /**
     * GET /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    export const getPetById: SDKMethods3<
      API.pet.getPetById.method,
      API.pet.getPetById.Params,
      API.pet.getPetById.APIResponse
    >;

    /**
     * PUT /pet
     * Update an existing pet by Id
     * @summary: Update an existing pet
     */
    export const updatePet: SDKMethods3<
      API.pet.updatePet.method,
      API.pet.updatePet.bodyParams,
      API.pet.updatePet.APIResponse
    >;

    /**
     * POST /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    export const updatePetWithForm: SDKMethods3<
      API.pet.updatePetWithForm.method,
      API.pet.updatePetWithForm.Params,
      API.pet.updatePetWithForm.APIResponse
    >;

    /**
     * POST /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    export const uploadFile: SDKMethods4<
      API.pet.uploadFile.method,
      API.pet.uploadFile.Params,
      API.pet.uploadFile.bodyParams,
      API.pet.uploadFile.APIResponse
    >;
  }

  export namespace store {
    /**
     * DELETE /store/order/{orderId}
     * For valid response try integer IDs with value < 1000. Anything above 1000 or nonintegers will generate API errors
     * @summary: Delete purchase order by ID
     */
    export const deleteOrder: SDKMethods3<
      API.store.deleteOrder.method,
      API.store.deleteOrder.Params,
      API.store.deleteOrder.APIResponse
    >;

    /**
     * GET /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    export const getInventory: SDKMethods2<
      API.store.getInventory.method,
      API.store.getInventory.APIResponse
    >;

    /**
     * GET /store/order/{orderId}
     * For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions.
     * @summary: Find purchase order by ID
     */
    export const getOrderById: SDKMethods3<
      API.store.getOrderById.method,
      API.store.getOrderById.Params,
      API.store.getOrderById.APIResponse
    >;

    /**
     * POST /store/order
     * Place a new order in the store
     * @summary: Place an order for a pet
     */
    export const placeOrder: SDKMethods3<
      API.store.placeOrder.method,
      API.store.placeOrder.bodyParams,
      API.store.placeOrder.APIResponse
    >;
  }

  export namespace user {
    /**
     * POST /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    export const createUser: SDKMethods3<
      API.user.createUser.method,
      API.user.createUser.bodyParams,
      API.user.createUser.APIResponse
    >;

    /**
     * POST /user/createWithList
     * Creates list of users with given input array
     * @summary: Creates list of users with given input array
     */
    export const createUsersWithListInput: SDKMethods3<
      API.user.createUsersWithListInput.method,
      API.user.createUsersWithListInput.bodyParams,
      API.user.createUsersWithListInput.APIResponse
    >;

    /**
     * DELETE /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    export const deleteUser: SDKMethods3<
      API.user.deleteUser.method,
      API.user.deleteUser.Params,
      API.user.deleteUser.APIResponse
    >;

    /**
     * GET /user/{username}
     * @summary: Get user by user name
     */
    export const getUserByName: SDKMethods3<
      API.user.getUserByName.method,
      API.user.getUserByName.Params,
      API.user.getUserByName.APIResponse
    >;

    /**
     * GET /user/login
     * @summary: Logs user into the system
     */
    export const loginUser: SDKMethods3<
      API.user.loginUser.method,
      API.user.loginUser.Params,
      API.user.loginUser.APIResponse
    >;

    /**
     * GET /user/logout
     * @summary: Logs out current logged in user session
     */
    export const logoutUser: SDKMethods2<
      API.user.logoutUser.method,
      API.user.logoutUser.APIResponse
    >;

    /**
     * PUT /user/{username}
     * This can only be done by the logged in user.
     * @summary: Update user
     */
    export const updateUser: SDKMethods4<
      API.user.updateUser.method,
      API.user.updateUser.Params,
      API.user.updateUser.bodyParams,
      API.user.updateUser.APIResponse
    >;
  }
}