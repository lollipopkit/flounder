// Bundle the compiled server entry (dist/cli.js) into one self-contained ESM
// file, so the runtime Docker image can ship without node_modules.
//
// Third-party runtime deps (pi-ai, pi-coding-agent, typebox, provider SDKs)
// live in devDependencies/peerDependencies; esbuild inlines them here. Node
// builtins stay external. The createRequire banner supports the CJS
// `require("node:...")` calls that a few dependencies perform dynamically.
//
// NOT bundled (read from disk at runtime): the UI static dir (./public,
// resolved relative to this bundle via import.meta.url) and the sandbox
// Dockerfiles under docker/ (resolved via process.cwd()/docker). Those are
// copied alongside the bundle in docker/flounder.Dockerfile.
import { build } from "esbuild";

await build({
  entryPoints: ["dist/cli.js"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  outfile: "dist/server.mjs",
  banner: {
    js: "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);",
  },
  logLevel: "info",
});
