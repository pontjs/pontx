import fetch from "node-fetch";
import { APIs, defs, pontxSDK } from "./services/sdk";

const myPontxFetcher = pontxSDK.fetcher;

myPontxFetcher.protocol = "https";

myPontxFetcher.request = async function (params: any, requestOptions, config) {
  const { url, options } = await this.beforeRequest(params, requestOptions, config!);

  const result = await fetch(url, options);
  return this.handleResponse(result as any, url, options, config!);
};

// reqeust API by Node.js
APIs.petstore.pet.findPetsByStatus
  .request({
    status: ["available"],
  })
  .then((pets) => {
    pets.map((pet) => {
      console.log(pet.name);
    });
  });
APIs.petstore.pet.addPet
  .request(
    // params
    {},
    // request header
    {
      body: {
        name: "doggie",
        photoUrls: ["string"],
        tags: [
          {
            id: 0,
            name: "string",
          },
        ],
        status: "available",
      },
    },
  )
  .then((pets) => {});
