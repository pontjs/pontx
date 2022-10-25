/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly runtime: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "react/jsx-runtime" {
  export default any;
}
