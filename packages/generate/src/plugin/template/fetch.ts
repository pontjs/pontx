const fetchtTs = `import { PontxAPISDK, PontxFetcher, defaultFetcherInstance } from "pontx-sdk-core";

export const defaults = {
  ...defaultFetcherInstance.config,
};

const apiSDK = new PontxAPISDK();

apiSDK.getFetchConfig = () => {
  return {
    ...defaultFetcherInstance.config,
    ...defaults,
  };
};

export const useFetch = (fetcher: PontxFetcher) => {
  apiSDK.setFetchInstance(fetcher);
};

export { apiSDK };
`;

export const getFetchTs = () => {
  return fetchtTs;
};
