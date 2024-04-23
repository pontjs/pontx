import * as React from "react";
import { getVSCode } from "../utils/utils";

import { PontUIService } from "pontx-ui/dist/es6/components/utils/service";

import { DiffPage } from "pontx-ui/dist/es6/components/changes/DiffPage";
import { APIDoc } from "pontx-ui/dist/es6/common/APIDoc/APIDoc";
import { StructDoc } from "pontx-ui/dist/es6/common/StructDoc/index";

// (window as any).routerMeta = {};
const getRouterMeta = (): any => {
  if (typeof window === "undefined") {
    return {};
  }

  const routerMetaStr = (document.getElementById("router-meta-data") as any)?.value;
  let value = {};
  try {
    value = JSON.parse(decodeURI(routerMetaStr));
    getVSCode().setState(value);
  } catch (e) {}

  return value;
};

export class AppProps {
  routerMeta? = getRouterMeta();
}

export const App: React.FC<AppProps> = (props) => {
  const [appMeta, setAppMeta] = React.useState(props.routerMeta);
  const { pageType, schemaType, specName, modName, name, spec: metaSpec, remoteSpec } = appMeta || {};

  const [itemMeta, setItemMeta] = React.useState(metaSpec);
  const [defs, setDefs] = React.useState({});

  React.useEffect(() => {
    if (!appMeta) {
      const newAppMeta = getRouterMeta();
      if (newAppMeta) {
        setAppMeta(newAppMeta);
        setItemMeta(newAppMeta.spec);
      }
    }

    window.addEventListener("message", (event) => {
      console.log(event);
      const responseMessage = event.data;
      if (responseMessage?.type === "updateItemMeta") {
        console.log(responseMessage);
        setItemMeta(responseMessage.data);
      }
    });
    PontUIService.requestDefinitions(specName).then((defs) => {
      setDefs(defs);
    });
  }, []);

  return React.useMemo(() => {
    if (!appMeta) {
      return null;
    }

    if (!metaSpec && !remoteSpec) {
      return <div className="vscode-page">loading...</div>;
    }
    if (pageType === "document") {
      if (schemaType === "api") {
        return (
          <div className="vscode-page">
            <APIDoc
              api={itemMeta}
              definitions={defs}
              onStructClick={(struct) => {
                PontUIService.openMeta({ ...struct, specName });
              }}
            />
          </div>
        );
      } else if (schemaType === "struct") {
        return (
          <div className="vscode-page">
            <StructDoc
              name={name}
              schema={itemMeta}
              definitions={defs}
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
            localSpec={metaSpec}
            remoteSpec={remoteSpec}
            definitions={defs}
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
  }, [itemMeta, defs]);
};

App.defaultProps = new AppProps();
