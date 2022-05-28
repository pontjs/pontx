/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly runtime: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
