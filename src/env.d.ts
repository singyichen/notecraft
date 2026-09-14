/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_NOTECRAFT_REPO_HINT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
