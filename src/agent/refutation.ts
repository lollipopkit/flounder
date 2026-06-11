import type { AuditorConfig } from "../config.js";
import type { RunLogger } from "../trace/logger.js";
import type { Doc, LlmClient } from "../types.js";
import { extractJsonObject } from "../util/json.js";
import type { AgentFinding } from "./tools.js";

// Independent refutation. A confirmed finding rests on one chain of reasoning (and
// possibly one self-authored test). A fresh-context skeptic — which never saw the
// finder's investigation — re-derives the invariant from first principles and
// tries to BREAK the claim: show the property is actually enforced, or the exploit
// does not work. Disagreement is surfaced; a single-test confirmation a skeptic
// debunks is downgraded. This guards against a single chain inheriting a wrong
// assumption (including "it matches upstream").

export const REFUTE_SYSTEM = `You are an independent adversarial reviewer. Another auditor produced an UNVERIFIED vulnerability claim. You did NOT do the original investigation; do not assume the claim is right or wrong.
Your job is to REFUTE it: determine from the actual code and first principles whether the alleged security property is in fact enforced (so the claim is wrong), or whether the exploit reasoning has a flaw that makes it not exploitable.
Do not clear the code because it "matches upstream", a spec, or looks standard — a reference can carry the same bug. Reason from the security property itself.
Be skeptical of the claim, but honest: if you genuinely cannot refute it, say so.
Respond with ONLY a JSON object and nothing else (no prose, no fences): {"refuted": true|false, "reason": "<concise and specific>"}.
- refuted=true: the claim is wrong — the property IS enforced (cite the exact constraint/line) or the exploit does not work (state the flaw).
- refuted=false: you could not refute it; the concern appears to stand.`;

export interface RefutationVerdict {
  findingId: string;
  refuted: boolean;
  reason: string;
}

export async function runRefutation(input: {
  findings: AgentFinding[];
  source: Doc[];
  cfg: AuditorConfig;
  llm: LlmClient;
  logger: RunLogger;
  max: number;
}): Promise<RefutationVerdict[]> {
  const out: RefutationVerdict[] = [];
  for (const finding of input.findings.slice(0, Math.max(0, input.max))) {
    const user = buildRefutationPrompt(finding, sourceForLocation(input.source, finding.location));
    try {
      const raw = await input.llm.complete({
        tag: `refute_${finding.id}`,
        system: REFUTE_SYSTEM,
        user,
        model: input.cfg.auditModel,
        maxTokens: input.cfg.maxTokens,
        thinkingLevel: input.cfg.thinkingLevel,
        agentic: true,
      });
      const parsed = extractJsonObject<{ refuted?: unknown; reason?: unknown }>(raw);
      if (parsed && typeof parsed.refuted === "boolean") {
        const verdict: RefutationVerdict = { findingId: finding.id, refuted: parsed.refuted, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 800) : "" };
        finding.refutation = { refuted: verdict.refuted, reason: verdict.reason };
        out.push(verdict);
        await input.logger.event("hunt_refutation", { findingId: finding.id, refuted: verdict.refuted });
      }
    } catch (error) {
      await input.logger.event("hunt_refutation_error", { findingId: finding.id, error: error instanceof Error ? error.message.slice(0, 300) : String(error) });
    }
  }
  return out;
}

function buildRefutationPrompt(finding: AgentFinding, sourceSlice: string): string {
  return `An unverified vulnerability claim from another auditor:
- Title: ${finding.title}
- Location: ${finding.location}
- Asserted status: ${finding.confirmationStatus}
- Description: ${finding.description || "(none)"}
- Evidence: ${finding.evidence || "(none)"}
- Exploit sketch: ${finding.exploitSketch || "(none)"}
- Proposed fix: ${finding.fix || "(none)"}

Relevant source:
${sourceSlice}

Independently determine whether this claim holds. Try to refute it. Respond with the JSON verdict only.`;
}

function sourceForLocation(source: Doc[], location: string): string {
  const match = location.match(/([A-Za-z0-9_./-]+\.(?:rs|sol|go|ts|tsx|js|jsx|mjs|cjs|py|cairo|move))(?::(\d+))?/);
  if (!match) return "(no source slice could be resolved from the location; reason from the claim and your knowledge)";
  const file = match[1] ?? "";
  const line = match[2] ? Number.parseInt(match[2], 10) : undefined;
  const doc = source.find((d) => d.path === file) ?? source.find((d) => d.path.endsWith(`/${file}`) || d.path.endsWith(file)) ?? source.find((d) => d.path.includes(file));
  if (!doc) return `(source file "${file}" not found in scope)`;
  const lines = doc.content.split(/\r?\n/);
  if (lines.length <= 500) return `${doc.path} (${lines.length} lines):\n${numbered(lines, 1)}`;
  const start = line ? Math.max(1, line - 120) : 1;
  const end = Math.min(lines.length, start + 399);
  return `${doc.path} lines ${start}-${end} of ${lines.length}:\n${numbered(lines.slice(start - 1, end), start)}`;
}

function numbered(lines: string[], start: number): string {
  return lines.map((line, idx) => `${start + idx}\t${line}`).join("\n");
}
