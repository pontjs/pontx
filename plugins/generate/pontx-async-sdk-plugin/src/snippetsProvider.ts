import { SnippetsProvider } from "pontx-generate";

export const snippetsProvider: SnippetsProvider = (info) => {
  if (info.originName) {
  }
  const assignModule = info.controllerName ? `.${info.controllerName}` : "";
  const snippets = [
    {
      name: "request async",
      code: `try {
  const data = await API.${info.originName}${assignModule}.${info.api.name}.request({  });
} catch (e) {
}`,
    },
  ];

  if (info.api.method?.toUpperCase() === "GET") {
    snippets.push({
      name: "useRequest",
      code: `const { data, isLoading, error, mutate } = API.${info.originName}${assignModule}.${info.api.name}.useRequest({  })`,
    });
  }

  return snippets;
};
