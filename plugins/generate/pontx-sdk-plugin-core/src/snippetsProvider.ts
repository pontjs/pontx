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

  return snippets;
};
