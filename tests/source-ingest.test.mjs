import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadSource } from "../dist/ingest/source.js";
import { materialFingerprint } from "../dist/util/material-fingerprint.js";

test("source ingest: paths follow the sandbox build root for external projects", async () => {
  const base = await mkdtemp(path.join(os.tmpdir(), "flounder-source-root-"));
  const project = path.join(base, "sample-project");
  const scoped = path.join(project, "core", "contracts");
  await mkdir(scoped, { recursive: true });
  await writeFile(path.join(scoped, "Pool.sol"), "contract Pool {}\n");
  try {
    const docs = await loadSource([scoped], { publicRoot: project });
    assert.deepEqual(docs.map((doc) => doc.path), ["core/contracts/Pool.sol"]);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});

test("source ingest: without publicRoot a workspace dir outside cwd gets an external-label path prefix", async () => {
  // This is the exact divergence that broke prepare vs. audit material fingerprints:
  // a pipeline audit run reads the prepared workspace with sourcePaths === buildRoot,
  // so audit.ts's loadSource(sourcePaths, { publicRoot: buildRoot }) yields plain
  // relative doc.path values. prepare must load the SAME workspace the same way
  // (publicRoot pointed at the workspace itself) or the two phases hash different
  // path strings for byte-identical files and never converge.
  const base = await mkdtemp(path.join(os.tmpdir(), "flounder-source-root-"));
  const workspace = path.join(base, "prepare", "workspace");
  await mkdir(workspace, { recursive: true });
  await writeFile(path.join(workspace, "lib.rs"), "pub fn f() {}\n");
  try {
    const withoutPublicRoot = await loadSource([workspace]);
    const withPublicRoot = await loadSource([workspace], { publicRoot: workspace });
    assert.notDeepEqual(withoutPublicRoot.map((doc) => doc.path), withPublicRoot.map((doc) => doc.path));
    assert.deepEqual(withPublicRoot.map((doc) => doc.path), ["lib.rs"]);

    const prepareFingerprint = materialFingerprint([
      { label: "source", docs: withPublicRoot },
      { label: "build", docs: withPublicRoot },
      { label: "corpus", docs: [] },
    ]);
    // Mirrors audit.ts: sourcePaths === buildRoot === the prepared workspace dir.
    const auditSource = await loadSource([workspace], { publicRoot: workspace });
    const auditBuildDocs = await loadSource([workspace], { publicRoot: workspace });
    const auditFingerprint = materialFingerprint([
      { label: "source", docs: auditSource },
      { label: "build", docs: auditBuildDocs },
      { label: "corpus", docs: [] },
    ]);
    assert.equal(prepareFingerprint, auditFingerprint);
  } finally {
    await rm(base, { recursive: true, force: true });
  }
});
