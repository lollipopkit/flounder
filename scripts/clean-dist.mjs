#!/usr/bin/env node
import { rm } from "node:fs/promises";
import path from "node:path";

const dist = path.resolve("dist");
if (path.basename(dist) !== "dist") {
  throw new Error("Refusing to clean a non-dist directory.");
}

await rm(dist, { recursive: true, force: true });
