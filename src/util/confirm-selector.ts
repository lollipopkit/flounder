export interface ConfirmSelectors {
  exactKeys: Set<string>;
  originKeyById: Map<number, string>;
  hasFilter: boolean;
}

export function encodeConfirmOriginSelector(originId: unknown, findingKey: unknown): string | undefined {
  const id = typeof originId === "number" ? originId : Number(originId);
  const key = typeof findingKey === "string" ? findingKey.trim() : "";
  if (!Number.isFinite(id) || id <= 0 || !key) return undefined;
  return `origin:${Math.trunc(id)}:${encodeURIComponent(key)}`;
}

export function confirmSelectorsForFinding(row: { id?: unknown; finding_key?: unknown }): string[] {
  const key = typeof row.finding_key === "string" ? row.finding_key.trim() : "";
  const selectors = key ? [key] : [];
  const originSelector = encodeConfirmOriginSelector(row.id, key);
  if (originSelector) selectors.push(originSelector);
  return selectors;
}

export function parseConfirmSelectors(keys?: readonly string[]): ConfirmSelectors {
  const exactKeys = new Set<string>();
  const originKeyById = new Map<number, string>();
  for (const raw of keys ?? []) {
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value) continue;
    const match = /^origin:(\d+):(.+)$/.exec(value);
    if (match) {
      const id = Number(match[1]);
      let key = "";
      try {
        key = decodeURIComponent(match[2] ?? "").trim();
      } catch {
        key = "";
      }
      if (Number.isFinite(id) && key) originKeyById.set(id, key);
      continue;
    }
    exactKeys.add(value);
  }
  return { exactKeys, originKeyById, hasFilter: exactKeys.size > 0 || originKeyById.size > 0 };
}

export function matchConfirmSelector(selectors: ConfirmSelectors, artifactKey: string, originId: unknown): string | undefined {
  if (!selectors.hasFilter) return artifactKey;
  if (selectors.exactKeys.has(artifactKey)) return artifactKey;
  const id = typeof originId === "number" ? originId : Number(originId);
  if (Number.isFinite(id)) return selectors.originKeyById.get(id);
  return undefined;
}
