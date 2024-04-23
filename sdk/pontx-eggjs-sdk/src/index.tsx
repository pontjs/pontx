import { PontSpec, PontAPI } from "pontx-spec";
import { Application, Context } from "egg";
import template from "lodash/template";
import { getMetaDataFromSpec } from "./getMetaDataFromSpec";

class PontxEggjsServerOptions {
  baseURL?: string;
}

class PontxEggjsServerConfig {
  middlewares?: any[];
  serviceNamespaces?: string[];
  routePrefix?: string;
}

const registerAPI = (app: Application, modName, inter: PontAPI, config: PontxEggjsServerConfig) => {
  const { name, method, path, consumes, produces, parameters, responses, description } = inter;

  const eggPath = config.routePrefix + path.replace(/{/g, ":").replace(/}/g, "");
  app.router[method?.toLowerCase()](eggPath, ...config.middlewares, async (ctx: Context) => {
    const pathParams = ctx.params || {};
    const query = ctx.query || {};
    const body = ctx.request.body;
    const params = { ...query, ...pathParams };
    const headers = ctx.request.headers;

    let specService = ctx?.service;

    if (config.serviceNamespaces?.length) {
      config.serviceNamespaces.forEach((namespace) => {
        specService = specService?.[namespace];
      });
    }

    const result = await specService?.[modName]?.[name]({ params, body, headers });
    if (result !== undefined) {
      ctx.body = result;
    }
  });
};

class PontxEggjsServer {
  constructor(public spec: PontSpec, public options = new PontxEggjsServerOptions()) {}

  private config: PontxEggjsServerConfig = {};

  start(app: Application, config: PontxEggjsServerConfig) {
    const spec = this.spec;
    const routePrefix = config?.routePrefix || this.options.baseURL || this.spec?.basePath || "";

    this.config.routePrefix = routePrefix;
    this.config.middlewares = config?.middlewares || [];
    this.config.serviceNamespaces = config?.serviceNamespaces || [];

    if (PontSpec.checkHasMods(spec)) {
      const mods = PontSpec.getMods(spec);
      mods.forEach((mod) => {
        const { name, interfaces, description } = mod;

        interfaces.forEach((inter) => {
          registerAPI(app, name, inter, this.config);
        });
      });
    } else {
      const { name, apis, description } = spec;

      Object.keys(apis || {}).forEach((interName) => {
        const api = apis[interName];
        registerAPI(app, name, api, this.config);
      });
    }

    if (this.spec.name) {
      app.router.get("/pontx-ui/" + this.spec.name, async (ctx: Context) => {
        const result = await ctx.curl("https://pontx.oss-cn-hangzhou.aliyuncs.com/0.3.91/pontx-ui/index.html");
        const homeData = getMetaDataFromSpec(this.spec, this.spec.name, ctx.query);

        try {
          const htmlCode = result?.data?.toString("utf8");
          const compiled = template(htmlCode);

          ctx.body = compiled(homeData);
        } catch (e) {
          ctx.body = result;
        }
      });
      app.router.get(`/pontx/v2/${this.spec.name}/api-docs`, async (ctx: Context) => {
        ctx.body = this.spec;
      });
    }
  }

  router(app: Application, config?: PontxEggjsServerConfig) {
    this.start(app, config);
  }
}

export const createPontxEggjsServer = (spec: PontSpec, options?: PontxEggjsServerOptions) => {
  const server = new PontxEggjsServer(spec, options);

  return server;
};
