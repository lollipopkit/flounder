import assert from "node:assert/strict";
import test from "node:test";
import { profileProject, renderProjectProfile } from "../dist/profile/project.js";

test("project profile summarizes multi-language security context", () => {
  const profile = profileProject([
    {
      path: "package.json",
      kind: "source",
      content: JSON.stringify({ dependencies: { next: "latest", express: "latest" } }),
    },
    {
      path: "src/server/router.ts",
      kind: "source",
      content: `
        import express from "express";
        export function handler(req, res) {
          const url = req.query.webhook;
          fetch(url);
          db.query("select * from users where id = " + req.query.id);
        }
      `,
    },
    {
      path: "contracts/Vault.sol",
      kind: "source",
      content: `
        contract Vault {
          function withdraw(uint amount) external {
            msg.sender.call("");
          }
        }
      `,
    },
    {
      path: "pyproject.toml",
      kind: "source",
      content: "[project]\nname = \"sample\"",
    },
    {
      path: "worker/jobs.py",
      kind: "source",
      content: "def handler(event):\n    pickle.loads(event.body)\n",
    },
  ]);

  assert.ok(profile.languages.includes("TypeScript"));
  assert.ok(profile.languages.includes("Solidity"));
  assert.ok(profile.languages.includes("Python"));
  assert.ok(profile.frameworks.includes("React/Next.js"));
  assert.ok(profile.frameworks.includes("Node HTTP API"));
  assert.ok(profile.frameworks.includes("EVM smart contract"));
  assert.ok(profile.packageManagers.includes("npm/yarn/pnpm"));
  assert.ok(profile.packageManagers.includes("pip/poetry/uv"));
  assert.ok(profile.likelySecurityDomains.includes("server-side request and proxy safety"));
  assert.ok(profile.likelySecurityDomains.includes("data access and injection risk"));
  assert.ok(profile.likelySecurityDomains.includes("deserialization and parser safety"));
  assert.ok(profile.likelySecurityDomains.includes("smart contract security"));
  assert.ok(profile.entrypoints.includes("src/server/router.ts"));

  const rendered = renderProjectProfile(profile);
  assert.match(rendered, /Languages:/);
  assert.match(rendered, /Likely security domains:/);
});
