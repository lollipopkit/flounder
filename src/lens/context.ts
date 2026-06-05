import { BUILTIN_AUDITOR_AGENTS } from "../agents/registry.js";
import type { AuditLensPackDefinition, AuditorAgentDefinition, FailureMode, ProjectContext } from "../types.js";

const MAX_PACKS = 12;
const MAX_LIST_ITEMS = 24;
const MAX_FIELD_CHARS = 1600;

export function normalizeLensPacks(input: unknown): AuditLensPackDefinition[] {
  if (!Array.isArray(input)) return [];
  return input.map(normalizeLensPack).filter((pack): pack is AuditLensPackDefinition => pack !== undefined).slice(0, MAX_PACKS);
}

export function normalizeProjectContext(input: unknown): ProjectContext | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const out: ProjectContext = {};
  const summary = cleanString(raw.summary, MAX_FIELD_CHARS);
  if (summary) out.summary = summary;
  setList(out, "criticalAssets", raw.criticalAssets ?? raw.critical_assets);
  setList(out, "attackerCapabilities", raw.attackerCapabilities ?? raw.attacker_capabilities);
  setList(out, "trustBoundaries", raw.trustBoundaries ?? raw.trust_boundaries);
  setList(out, "securityInvariants", raw.securityInvariants ?? raw.security_invariants);
  setList(out, "focusAreas", raw.focusAreas ?? raw.focus_areas);
  setList(out, "outOfScope", raw.outOfScope ?? raw.out_of_scope);
  setList(out, "scenarioGuidance", raw.scenarioGuidance ?? raw.scenario_guidance);
  return Object.keys(out).length === 0 ? undefined : out;
}

export function mergeProjectContexts(contexts: Array<ProjectContext | undefined>): ProjectContext {
  const out: ProjectContext = {};
  const summaries = contexts.flatMap((context) => (context?.summary ? [context.summary] : []));
  if (summaries.length > 0) out.summary = uniq(summaries).join("\n");
  mergeList(out, "criticalAssets", contexts);
  mergeList(out, "attackerCapabilities", contexts);
  mergeList(out, "trustBoundaries", contexts);
  mergeList(out, "securityInvariants", contexts);
  mergeList(out, "focusAreas", contexts);
  mergeList(out, "outOfScope", contexts);
  mergeList(out, "scenarioGuidance", contexts);
  return out;
}

export function renderProjectContext(context: ProjectContext | undefined): string {
  if (!context || Object.keys(context).length === 0) return "(none configured)";
  return [
    context.summary ? `Summary: ${context.summary}` : "",
    renderList("Critical assets", context.criticalAssets),
    renderList("Attacker capabilities", context.attackerCapabilities),
    renderList("Trust boundaries", context.trustBoundaries),
    renderList("Security invariants", context.securityInvariants),
    renderList("Focus areas", context.focusAreas),
    renderList("Out of scope", context.outOfScope),
    renderList("Scenario guidance", context.scenarioGuidance),
  ].filter(Boolean).join("\n");
}

export function renderLensPacks(packs: AuditLensPackDefinition[]): string {
  if (packs.length === 0) return "(none configured)";
  return packs
    .map((pack) => {
      const context = renderProjectContext(pack.projectContext);
      return [
        `Lens pack: ${pack.id}${pack.displayName ? ` (${pack.displayName})` : ""}`,
        pack.description ? `Description: ${pack.description}` : "",
        renderList("Failure modes", pack.failureModes),
        renderList("Enumeration guidance", pack.enumerationGuidance),
        renderList("Audit guidance", pack.auditGuidance),
        context === "(none configured)" ? "" : `Project context:\n${context}`,
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export function renderAuditGuidanceForFailureMode(packs: AuditLensPackDefinition[], failureMode: FailureMode): string {
  const relevant = packs.filter(
    (pack) =>
      pack.failureModes?.includes(failureMode) ||
      pack.auditorAgents?.some((agent) => agent.failureMode === failureMode),
  );
  if (relevant.length === 0) return "";
  return relevant
    .map((pack) =>
      [
        `Lens pack: ${pack.id}${pack.displayName ? ` (${pack.displayName})` : ""}`,
        pack.description ? `Description: ${pack.description}` : "",
        renderList("Pack audit guidance", pack.auditGuidance),
        pack.projectContext ? `Pack context:\n${renderProjectContext(pack.projectContext)}` : "",
      ].filter(Boolean).join("\n"),
    )
    .join("\n\n");
}

export function auditorAgentsFromLensPacks(packs: AuditLensPackDefinition[]): AuditorAgentDefinition[] {
  const out: AuditorAgentDefinition[] = [];
  const explicit = new Set<string>();
  for (const pack of packs) {
    for (const agent of pack.auditorAgents ?? []) {
      explicit.add(agent.failureMode);
      out.push(agent);
    }
  }
  for (const pack of packs) {
    for (const mode of pack.failureModes ?? []) {
      if (explicit.has(mode) || mode in BUILTIN_AUDITOR_AGENTS) continue;
      explicit.add(mode);
      out.push({
        failureMode: mode,
        id: `${pack.id}-${mode}-auditor`,
        displayName: `${humanize(mode)} Auditor`,
        guidance: [
          pack.description ?? `Project-specific lens pack ${pack.id}.`,
          ...(pack.auditGuidance ?? []),
          "Reason from the assigned source and reference material. Do not claim a bug without concrete code evidence.",
        ].join("\n"),
      });
    }
  }
  return out;
}

function normalizeLensPack(input: unknown): AuditLensPackDefinition | undefined {
  if (!input || typeof input !== "object") return undefined;
  const raw = input as Record<string, unknown>;
  const id = slugId(cleanString(raw.id, 120) ?? cleanString(raw.displayName ?? raw.display_name, 120) ?? "");
  if (!id) return undefined;
  const pack: AuditLensPackDefinition = { id };
  const displayName = cleanString(raw.displayName ?? raw.display_name, 120);
  const description = cleanString(raw.description, MAX_FIELD_CHARS);
  const projectContext = normalizeProjectContext(raw.projectContext ?? raw.project_context);
  const failureModes = cleanStringList(raw.failureModes ?? raw.failure_modes).map(slugMode).filter(Boolean);
  const auditorAgents = cleanAuditorAgents(raw.auditorAgents ?? raw.auditor_agents);
  const enumerationGuidance = cleanStringList(raw.enumerationGuidance ?? raw.enumeration_guidance);
  const auditGuidance = cleanStringList(raw.auditGuidance ?? raw.audit_guidance);

  if (displayName) pack.displayName = displayName;
  if (description) pack.description = description;
  if (projectContext) pack.projectContext = projectContext;
  if (failureModes.length > 0) pack.failureModes = uniq(failureModes) as FailureMode[];
  if (auditorAgents.length > 0) pack.auditorAgents = auditorAgents;
  if (enumerationGuidance.length > 0) pack.enumerationGuidance = enumerationGuidance;
  if (auditGuidance.length > 0) pack.auditGuidance = auditGuidance;
  return pack;
}

function cleanAuditorAgents(input: unknown): AuditorAgentDefinition[] {
  if (!Array.isArray(input)) return [];
  return input.map((item) => {
    if (!item || typeof item !== "object") return undefined;
    const raw = item as Record<string, unknown>;
    const failureMode = slugMode(cleanString(raw.failureMode ?? raw.failure_mode, 120) ?? "");
    const id = slugId(cleanString(raw.id, 120) ?? `${failureMode}-auditor`);
    const displayName = cleanString(raw.displayName ?? raw.display_name, 120) ?? `${humanize(failureMode)} Auditor`;
    const guidance = cleanString(raw.guidance, MAX_FIELD_CHARS);
    if (!failureMode || !id || !guidance) return undefined;
    return { failureMode, id, displayName, guidance } as AuditorAgentDefinition;
  }).filter((agent): agent is AuditorAgentDefinition => agent !== undefined).slice(0, MAX_LIST_ITEMS);
}

function setList<K extends keyof ProjectContext>(out: ProjectContext, key: K, value: unknown): void {
  const cleaned = cleanStringList(value);
  if (cleaned.length > 0) out[key] = cleaned as ProjectContext[K];
}

function mergeList<K extends keyof ProjectContext>(out: ProjectContext, key: K, contexts: Array<ProjectContext | undefined>): void {
  const values = uniq(contexts.flatMap((context) => (Array.isArray(context?.[key]) ? context[key] as string[] : [])));
  if (values.length > 0) out[key] = values.slice(0, MAX_LIST_ITEMS) as ProjectContext[K];
}

function cleanStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return uniq(value.map((item) => cleanString(item, MAX_FIELD_CHARS)).filter((item): item is string => item !== undefined)).slice(0, MAX_LIST_ITEMS);
}

function cleanString(value: unknown, maxChars: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length === 0 ? undefined : cleaned.slice(0, maxChars);
}

function renderList(label: string, values: string[] | undefined): string {
  return values && values.length > 0 ? `${label}: ${values.join("; ")}` : "";
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function slugMode(input: string): FailureMode {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) as FailureMode;
}

function slugId(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function humanize(input: string): string {
  return input.replace(/[_-]+/g, " ").replace(/\b[a-z]/g, (char) => char.toUpperCase());
}
