import assert from "node:assert/strict";
import test from "node:test";
import { verifyHasRequiredVerdict } from "../dist/agent/pi-session.js";
import { newSession } from "../dist/agent/tools.js";

test("pi VERIFY mode requires a non-empty verdict finding", () => {
  const missing = newSession();
  assert.equal(verifyHasRequiredVerdict(missing), false);

  const empty = newSession();
  empty.scratchFiles.set("findings.json", "[]");
  assert.equal(verifyHasRequiredVerdict(empty), false);

  const wrappedEmpty = newSession();
  wrappedEmpty.scratchFiles.set("findings.json", JSON.stringify({ findings: [] }));
  assert.equal(verifyHasRequiredVerdict(wrappedEmpty), false);

  const verdict = newSession();
  verdict.scratchFiles.set("findings.json", JSON.stringify([
    {
      title: "REFUTED: claim is mitigated",
      severity: "info",
      location: "src/example.ts:1",
      description: "The cited value is bound by a nearby check.",
    },
  ]));
  assert.equal(verifyHasRequiredVerdict(verdict), true);
});
