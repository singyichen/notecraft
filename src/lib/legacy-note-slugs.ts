/** Known broken note URLs that must remain usable as static-site redirects. */
export const LEGACY_NOTE_SLUG_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  "機器學習\uFFFD\uFFFD實作系列第16週-期末專案": "機器學習實作系列第16週-期末專案",
});

export function legacyNoteSlugRedirect(slug: string): string | null {
  return LEGACY_NOTE_SLUG_REDIRECTS[slug] ?? null;
}

export function legacyNoteSlugRedirectsFor(noteSlugs: ReadonlySet<string>) {
  return Object.keys(LEGACY_NOTE_SLUG_REDIRECTS).flatMap((slug) => {
    const canonicalSlug = legacyNoteSlugRedirect(slug);
    return canonicalSlug && noteSlugs.has(canonicalSlug) ? [{ slug, canonicalSlug }] : [];
  });
}
