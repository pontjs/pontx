import * as React from "react";
import { APIDocumment, DiffContent, StructDocument, PontUIService, DiffPage, LayoutContext } from "pont-ui";
import { WebviewApi } from "vscode-webview";
import { PontSpec } from "pont-spec";
import { vscode } from "./utils/utils";

// (window as any).routerMeta = {};
const getRouterMeta = (): any => {
  const routerMetaStr = (document.getElementById("router-meta-data") as any).value;
  let value = {};
  try {
    value = JSON.parse(decodeURI(routerMetaStr));
  } catch (e) {}

  vscode.setState(value);
  return value;
};

export class AppProps {}

export const App: React.FC<AppProps> = (props) => {
  const { specs } = LayoutContext.useContainer();
  const { pageType, schemaType, specName, modName, name, spec: metaSpec } = getRouterMeta();
  const spec = specs?.find((spec) => spec?.name === specName) || specs?.[0];

  const mod = spec
    ? (PontSpec.getMods(spec) || []).find((mod) => mod.name === modName) || PontSpec.getMods(spec)?.[0]
    : undefined;
  const api = mod ? (mod?.interfaces || []).find((api) => api?.name === name) || mod?.interfaces?.[0] : undefined;

  return React.useMemo(() => {
    if (!specs?.length && !metaSpec) {
      return <div className="vscode-page">loading...</div>;
    }
    if (pageType === "document") {
      if (schemaType === "api") {
        return (
          <div className="vscode-page">
            <APIDocumment
              selectedApi={api || metaSpec}
              definitions={spec?.definitions}
              onStructClick={(struct) => {
                PontUIService.openMeta({ ...struct, specName });
              }}
            />
          </div>
        );
      } else if (schemaType === "struct") {
        return (
          <div className="vscode-page">
            <StructDocument
              name={name}
              schema={spec?.definitions?.[name] || metaSpec}
              definitions={spec?.definitions}
              onStructClick={(struct) => {
                PontUIService.openMeta({ ...struct, specName });
              }}
            />
          </div>
        );
      }
    } else if (pageType === "changes") {
      return (
        <div className="vscode-page">
          <DiffPage
            modName={modName}
            name={name}
            schemaType={schemaType}
            onStructClick={(struct) => {
              PontUIService.openMeta({ ...struct, specName });
            }}
          />
        </div>
      );
    }
    return <div className="vscode-page"></div>;
  }, [specs.length, ...specs]);
};

App.defaultProps = new AppProps();
