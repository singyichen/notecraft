export type RefsSnapshot = { markerIds: string[]; importIds: string[] };

const FRONTMATTER_RE = /^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/;
const UPDATED_AT_RE = /^updatedAt:\s*.*$/m;
const MARKER_BLOCK_RE = /\{\/\*\s*@ai-(?:visualize|reference)[\s\S]*?\*\/\}/g;
const MARKER_ID_RE = /^id:\s*(.+)$/m;
const IMPORT_RE = /from\s+["']@\/components\/generated\/([^"']+)["']/g;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { frontmatter: "", body: raw };
  return { frontmatter: m[1], body: m[2] };
}

export function bumpUpdatedAt(frontmatter: string, today: string = todayISO()): string {
  if (!UPDATED_AT_RE.test(frontmatter)) return frontmatter;
  return frontmatter.replace(UPDATED_AT_RE, `updatedAt: "${today}"`);
}

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function base64ToUtf8(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function extractRefs(body: string): RefsSnapshot {
  const markerIds: string[] = [];
  for (const block of body.match(MARKER_BLOCK_RE) ?? []) {
    const idMatch = block.match(MARKER_ID_RE);
    if (idMatch) markerIds.push(idMatch[1].trim());
  }
  const importIds: string[] = [];
  for (const m of body.matchAll(IMPORT_RE)) {
    importIds.push(m[1]);
  }
  return { markerIds, importIds };
}

export function diffRemovedRefs(before: RefsSnapshot, after: RefsSnapshot): RefsSnapshot {
  return {
    markerIds: before.markerIds.filter((id) => !after.markerIds.includes(id)),
    importIds: before.importIds.filter((id) => !after.importIds.includes(id)),
  };
}
