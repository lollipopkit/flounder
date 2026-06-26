import assert from "node:assert/strict";
import test from "node:test";
import { daemonVisibleSandboxReadiness } from "../dist/server/daemon.js";
import { DEFAULT_SANDBOX_IMAGE } from "../dist/security/sandbox.js";

test("daemon: missing default sandbox image is an auto-recoverable capability", () => {
  const visible = daemonVisibleSandboxReadiness({
    ok: false,
    backend: "auto",
    image: DEFAULT_SANDBOX_IMAGE,
    allowHostFallback: false,
    message: "No OCI sandbox is available.",
  });

  assert.equal(visible.ok, true);
  assert.equal(visible.autoBuild, true);
  assert.match(visible.message ?? "", /built automatically/);
});

test("daemon: missing custom sandbox image remains operator-visible", () => {
  const visible = daemonVisibleSandboxReadiness({
    ok: false,
    backend: "auto",
    image: "custom-audit-image:latest",
    allowHostFallback: false,
    message: "No OCI sandbox is available.",
  });

  assert.equal(visible.ok, false);
  assert.equal(visible.autoBuild, undefined);
});
