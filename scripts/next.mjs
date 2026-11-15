import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
try {
  const nativePackage = process.platform === "win32"
    ? `@next/swc-${process.platform}-${process.arch}-msvc`
    : `@next/swc-${process.platform}-${process.arch}`;
  require(nativePackage);
} catch {
  process.env.NEXT_TEST_WASM_DIR = resolve("node_modules/@next/swc-wasm-nodejs");
}

await import(pathToFileURL(require.resolve("next/dist/bin/next")).href);
