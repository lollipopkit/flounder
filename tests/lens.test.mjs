import assert from "node:assert/strict";
import test from "node:test";
import { defaultConfig, effectiveAuditorAgents, effectiveFailureModes } from "../dist/config.js";
import {
  auditorAgentsFromLensPacks,
  mergeProjectContexts,
  normalizeLensPacks,
  renderAuditGuidanceForFailureMode,
  renderLensPacks,
  renderProjectContext,
} from "../dist/lens/context.js";

test("project-specific lens packs add custom failure modes and guidance", () => {
  const packs = normalizeLensPacks([
    {
      id: "tenant-isolation",
      displayName: "Tenant Isolation",
      projectContext: {
        criticalAssets: ["tenant-owned documents"],
        trustBoundaries: ["request identity to database object ownership"],
        securityInvariants: ["users can access only objects in their tenant"],
      },
      failureModes: ["cross_tenant_object_access", "access_control"],
      auditorAgents: [
        {
          failureMode: "cross_tenant_object_access",
          id: "tenant-object-auditor",
          displayName: "Tenant Object Auditor",
          guidance: "Trace tenant id, object id, and authorization checks together.",
        },
      ],
      enumerationGuidance: ["Find query paths that load objects by id."],
      auditGuidance: ["Confirm tenant ownership is enforced in the same query or transaction."],
    },
  ]);

  assert.equal(packs.length, 1);
  assert.deepEqual(auditorAgentsFromLensPacks(packs).map((agent) => agent.id), ["tenant-object-auditor"]);

  const cfg = defaultConfig();
  cfg.lensPacks = packs;
  assert.ok(effectiveFailureModes(cfg).includes("cross_tenant_object_access"));
  assert.ok(effectiveAuditorAgents(cfg).some((agent) => agent.id === "tenant-object-auditor"));

  const merged = mergeProjectContexts([cfg.projectContext, ...packs.map((pack) => pack.projectContext)]);
  assert.ok(merged.criticalAssets?.includes("tenant-owned documents"));
  assert.match(renderProjectContext(merged), /tenant-owned documents/);
  assert.match(renderLensPacks(packs), /Tenant Isolation/);
  assert.match(renderAuditGuidanceForFailureMode(packs, "cross_tenant_object_access"), /same query or transaction/);
});
