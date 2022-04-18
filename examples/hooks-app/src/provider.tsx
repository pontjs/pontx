// import "./services/index";
// import * as SWR from "swr";

// enableHooksPont((window as any).API, {
//   getUrlKey() {},
//   fetch(url: string, options: any) {},
//   useRequest(path, params, swrOptions, { method }) {}
// });

// const defaultConfig = {};

// const enableHooksPont = (origin: any, config: any) => {
//   Object.keys(origin).map(modName => {
//     const mod = origin[modName];
//     Object.keys(mod).map(apiName => {
//       const api = mod[apiName];
//       const { path, method, hasBody } = api;

//       api.mutate = (
//         params = {},
//         newValue = undefined,
//         shouldRevalidate = true
//       ) => {
//         return SWR.mutate(
//           config.getUrlKey(path, params, method),
//           newValue,
//           shouldRevalidate
//         );
//       };
//       api.trigger = (params = {}, shouldRevalidate = true) => {
//         return SWR.trigger(
//           config.getUrlKey(path, params, method),
//           shouldRevalidate
//         );
//       };

//       if (api.method === "GET") {
//         api.useRequest = (params = {}, swrOptions = {}) => {
//           return config.useRequest(path, params, swrOptions);
//         };
//       } else {
//         api.useDeprecatedRequest = (params = {}, swrOptions = {}) => {
//           return config.useRequest(path, params, swrOptions, { method });
//         };
//       }

//       if (hasBody) {
//         api.request = (params: any, body: any, options = {}) => {
//           return config.fetch(config.getUrlKey(path, params, method), {
//             method,
//             body,
//             ...options
//           });
//         };
//       } else {
//         api.request = (params: any, options = {}) => {
//           return config.fetch(config.getUrl(path, params, method), {
//             method,
//             ...options
//           });
//         };
//       }
//     });
//   });
// };
