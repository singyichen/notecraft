/** Known broken note URLs that must remain usable as static-site redirects. */
export const LEGACY_NOTE_SLUG_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  "機器學習��實作系列第16週-期末專案": "機器學習實作系列第16週-期末專案",
  "電子學實作系列第6週-CE放大器實驗": "電子學實作系列第6週-ce放大器實驗",
});

export function legacyNoteSlugRedirect(slug: string): string | null {
  return LEGACY_NOTE_SLUG_REDIRECTS[slug] ?? null;
}

/**
 * 只差大小寫的別名。這種別名的靜態輸出路徑（`dist/notes/<slug>/index.html`）
 * 在大小寫不敏感的檔案系統上會和正式筆記頁落在同一個目錄，後寫的那份會蓋掉前一份——
 * 症狀是本機 build 出來的筆記頁變成指向自己的重導向空殼。
 * Netlify 跑 Linux，兩個路徑是分開的，所以正式站照常輸出這一頁。
 */
export function isCaseOnlyAlias(slug: string, canonicalSlug: string): boolean {
  return slug !== canonicalSlug && slug.toLowerCase() === canonicalSlug.toLowerCase();
}

export interface LegacyNoteSlugRedirectOptions {
  /** 大小寫不敏感的檔案系統上傳 false，只差大小寫的別名就不輸出，避免蓋掉正式頁。 */
  allowCaseOnlyAliases?: boolean;
}

export function legacyNoteSlugRedirectsFor(
  noteSlugs: ReadonlySet<string>,
  { allowCaseOnlyAliases = true }: LegacyNoteSlugRedirectOptions = {},
) {
  return Object.keys(LEGACY_NOTE_SLUG_REDIRECTS).flatMap((slug) => {
    const canonicalSlug = legacyNoteSlugRedirect(slug);
    if (!canonicalSlug || !noteSlugs.has(canonicalSlug)) return [];
    if (!allowCaseOnlyAliases && isCaseOnlyAlias(slug, canonicalSlug)) return [];
    return [{ slug, canonicalSlug }];
  });
}
