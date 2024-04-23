import pontxSpec from './pontx/sdk/petstore/api-lock.json';
import { createPontxEggjsServer } from 'pontx-eggjs-sdk';

export const server = createPontxEggjsServer(pontxSpec as any, {});

import { Application } from 'egg';

export default (app: Application) => {
  const { router, controller } = app;

  // you can add middlewares to pontx auto controllers
  // const middlewares = [ app.middleware.authLogin(), app.middleware.permission(), app.middleware.handleResponse() ];

  server.start(app, []);
  // router.get('/', controller.home.index);
};
