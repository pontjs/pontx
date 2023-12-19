import { pontxSDK } from "./services/sdk/core";
import fetch from "node-fetch";
import { API, defs } from "./services/sdk";

const myPontxFetcher = pontxSDK.fetcher;

myPontxFetcher.getUrlPrefix = function () {
  // 根据 spec 指定请求 hostname 和 basePath
  if (this.specMeta.host) {
    if (this.specMeta.basePath) {
      return "https://" + this.specMeta.host + this.specMeta.basePath;
    }
    return "https://" + this.specMeta.host;
  }
  if (this.specMeta.basePath) {
    return "https://" + this.specMeta.basePath;
  }

  // 如果 spec 中未指定，可以手动指定
  return "http://petstore.swagger.io/v2";
};

myPontxFetcher.request = async function (params: any, requestOptions, config) {
  const { url, options } = await this.beforeRequest(params, requestOptions, config!);

  const result = await fetch(url, options);
  return this.handleResponse(result as any, url, options, config!);
};

// reqeust API by Node.js
API.petstore.pet.findPetsByStatus
  .request({
    status: ["available"],
  })
  .then((pets) => {
    pets.map((pet) => {
      console.log(pet.name);
    });
  });
