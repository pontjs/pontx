import { createClient } from "../../../sdk/browser/lib";
import { APIs } from "./services/petstore/apis";
import { specMeta } from "./services/petstore/apiMeta";
import useSWR from "swr";

const fetchFn = (url: string, options?: RequestInit) => {
  return fetch("https://petstore.swagger.io/v2" + url, options).then((res) =>
    res.json()
  );
};

export const petstoreClient = createClient<APIs>({
  fetchFn,
  pontxSpecMeta: specMeta,
});

export const useQuery = <Data>(queryOptions: {
  fetchKey: string;
  fetchFn: () => Promise<Data>;
}) => {
  return useSWR<Data>(queryOptions.fetchKey, queryOptions.fetchFn);
};
