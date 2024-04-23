import type { API, defs } from './type.d.ts';
type RequestOptions = {}

export namespace Services {
  /** Everything about your Pets */
  export interface PetService {
    /**
     * POST /pet/{petId}/uploadImage
     * @summary: uploads an image
     */
    uploadFile: (request: API.pet.uploadFile.Request, options?: RequestOptions) => Promise<API.pet.uploadFile.APIResponse>

    /**
     * PUT /pet
     * @summary: Update an existing pet
     */
    updatePet: (request: API.pet.updatePet.Request, options?: RequestOptions) => Promise<API.pet.updatePet.APIResponse>

    /**
     * POST /pet
     * @summary: Add a new pet to the store
     */
    addPet: (request: API.pet.addPet.Request, options?: RequestOptions) => Promise<API.pet.addPet.APIResponse>

    /**
     * GET /pet/findByStatus
     * Multiple status values can be provided with comma separated strings
     * @summary: Finds Pets by status
     */
    findPetsByStatus: (request: API.pet.findPetsByStatus.Request, options?: RequestOptions) => Promise<API.pet.findPetsByStatus.APIResponse>

    /**
     * GET /pet/findByTags
     * Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing.
     * @summary: Finds Pets by tags
     * @deprecated
     */
    findPetsByTags: (request: API.pet.findPetsByTags.Request, options?: RequestOptions) => Promise<API.pet.findPetsByTags.APIResponse>

    /**
     * GET /pet/{petId}
     * Returns a single pet
     * @summary: Find pet by ID
     */
    getPetById: (request: API.pet.getPetById.Request, options?: RequestOptions) => Promise<API.pet.getPetById.APIResponse>

    /**
     * DELETE /pet/{petId}
     * @summary: Deletes a pet
     */
    deletePet: (request: API.pet.deletePet.Request, options?: RequestOptions) => Promise<API.pet.deletePet.APIResponse>

    /**
     * POST /pet/{petId}
     * @summary: Updates a pet in the store with form data
     */
    updatePetWithForm: (request: API.pet.updatePetWithForm.Request, options?: RequestOptions) => Promise<API.pet.updatePetWithForm.APIResponse>
  }

  /** Access to Petstore orders */
  export interface StoreService {
    /**
     * GET /store/inventory
     * Returns a map of status codes to quantities
     * @summary: Returns pet inventories by status
     */
    getInventory: (request: API.store.getInventory.Request, options?: RequestOptions) => Promise<API.store.getInventory.APIResponse>

    /**
     * POST /store/order
     * @summary: Place an order for a pet
     */
    placeOrder: (request: API.store.placeOrder.Request, options?: RequestOptions) => Promise<API.store.placeOrder.APIResponse>

    /**
     * GET /store/order/{orderId}
     * For valid response try integer IDs with value >= 1 and <= 10. Other values will generated exceptions
     * @summary: Find purchase order by ID
     */
    getOrderById: (request: API.store.getOrderById.Request, options?: RequestOptions) => Promise<API.store.getOrderById.APIResponse>

    /**
     * DELETE /store/order/{orderId}
     * For valid response try integer IDs with positive integer value. Negative or non-integer values will generate API errors
     * @summary: Delete purchase order by ID
     */
    deleteOrder: (request: API.store.deleteOrder.Request, options?: RequestOptions) => Promise<API.store.deleteOrder.APIResponse>
  }

  /** Operations about user */
  export interface UserService {
    /**
     * POST /user/createWithList
     * @summary: Creates list of users with given input array
     */
    createUsersWithListInput: (request: API.user.createUsersWithListInput.Request, options?: RequestOptions) => Promise<API.user.createUsersWithListInput.APIResponse>

    /**
     * GET /user/{username}
     * @summary: Get user by user name
     */
    getUserByName: (request: API.user.getUserByName.Request, options?: RequestOptions) => Promise<API.user.getUserByName.APIResponse>

    /**
     * DELETE /user/{username}
     * This can only be done by the logged in user.
     * @summary: Delete user
     */
    deleteUser: (request: API.user.deleteUser.Request, options?: RequestOptions) => Promise<API.user.deleteUser.APIResponse>

    /**
     * PUT /user/{username}
     * This can only be done by the logged in user.
     * @summary: Updated user
     */
    updateUser: (request: API.user.updateUser.Request, options?: RequestOptions) => Promise<API.user.updateUser.APIResponse>

    /**
     * GET /user/login
     * @summary: Logs user into the system
     */
    loginUser: (request: API.user.loginUser.Request, options?: RequestOptions) => Promise<API.user.loginUser.APIResponse>

    /**
     * GET /user/logout
     * @summary: Logs out current logged in user session
     */
    logoutUser: (request: API.user.logoutUser.Request, options?: RequestOptions) => Promise<API.user.logoutUser.APIResponse>

    /**
     * POST /user/createWithArray
     * @summary: Creates list of users with given input array
     */
    createUsersWithArrayInput: (request: API.user.createUsersWithArrayInput.Request, options?: RequestOptions) => Promise<API.user.createUsersWithArrayInput.APIResponse>

    /**
     * POST /user
     * This can only be done by the logged in user.
     * @summary: Create user
     */
    createUser: (request: API.user.createUser.Request, options?: RequestOptions) => Promise<API.user.createUser.APIResponse>
  }
}