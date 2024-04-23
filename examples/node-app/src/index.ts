import fetch from "node-fetch";
import { APIs, setDefaults, setRootDefaults } from "./services/sdk";

setRootDefaults({
  baseURL: "https://petstore.swagger.io/v2",
});

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
  .request({
    name: "doggie",
    photoUrls: ["string"],
    tags: [
      {
        id: 0,
        name: "string",
      },
    ],
    status: "available",
  })
  .then((pets) => {});
