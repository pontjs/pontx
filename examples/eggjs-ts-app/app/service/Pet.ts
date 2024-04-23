import { PetstoreServices } from '../pontx/sdk';
import { RequestOptions } from '../pontx/sdk/petstore/spec';
import { API, defs } from '../pontx/sdk/petstore/type';
import { Service } from 'egg';

export default class PetService extends Service implements PetstoreServices.PetService {
  async uploadFile(request: API.pet.uploadFile.Request, options?: RequestOptions): Promise<defs.ApiResponse> {
    // write your code here
    return null as any;
  }

  async updatePet(request: API.pet.updatePet.Request, options?: RequestOptions): Promise<any> {
    // write your code here
    return null as any;
  }

  async addPet(request: API.pet.addPet.Request, options?: RequestOptions): Promise<any> {
    // write your code here
    return null as any;
  }

  async findPetsByStatus(
    request: API.pet.findPetsByStatus.Request,
    options?: RequestOptions,
  ): Promise<Array<defs.Pet>> {
    // write your code here
    return [
      {
        id: 0,
        name: 'doggie',
        photoUrls: ['string'],
      },
    ];
  }

  async findPetsByTags(request: API.pet.findPetsByTags.Request, options?: RequestOptions): Promise<Array<defs.Pet>> {
    // write your code here
    return null as any;
  }

  async getPetById(request: API.pet.getPetById.Request, options?: RequestOptions): Promise<defs.Pet> {
    // write your code here
    return null as any;
  }

  async deletePet(request: API.pet.deletePet.Request, options?: RequestOptions): Promise<any> {
    // write your code here
    return null as any;
  }

  async updatePetWithForm(request: API.pet.updatePetWithForm.Request, options?: RequestOptions): Promise<any> {
    // write your code here
    return null as any;
  }
}
