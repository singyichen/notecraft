---
name: notecraft-design
description: NoteCraft 自身的視覺設計系統（上游 TrendLink DS 的 blue/orange 配色，搭配本專案保留的 Crimson Pro + Inter 字體）。AI 視覺化 / 簡報生成元件在決定色票、字級、圓角、陰影時應先讀這份文件，優先使用專案既有 CSS 變數與 class，不要硬編色碼。
user-invocable: true
---

Read this file before generating any visual component for NoteCraft (`content-visualize` / `content-present` skills, `component-generator` / `slide-generator` subagents). It documents the *actual* design tokens shipped in this repo — do not invent parallel color names or hardcode hex values that already have a token.

## Source of truth

- `src/styles/tokens.css` — canonical CSS variables (colors, type, radius, shadow, motion). **Always read this file** to confirm current values; this SKILL.md summarizes it but the CSS file wins if they ever disagree.
- `tailwind.config.mjs` — maps the CSS variables onto Tailwind's `blue` / `orange` / `neutral` color scales and `fontFamily.sans` / `.serif` / `.mono`.
- Reference component code: `src/components/Button.astro`, `Card.astro`, `Badge.astro`, `TagChip.astro` — copy their inline-style pattern (`style={...var(--token)...}`) rather than Tailwind utility classes when writing new `.astro`/`.tsx` in this repo, since that's the established convention here.

## Brand in one breath

Upstream's TrendLink DS: a calm documentation-tool mood — a deep **blue** primary with an **amber/orange** accent reserved for the single CTA, against neutral slate-blue grays. Tight corner radii (2–14px, noticeably crisper than a typical SaaS dashboard) and subtle shadows carrying a faint navy tint rather than pure black. No skeuomorphic gradients except the sidebar's brand gradient and the primary-button's accent gradient.

**Typography is the one deliberate divergence from upstream**: this repo keeps Crimson Pro serif headings + Inter UI + JetBrains Mono. Colors, radii and shadows were realigned to upstream on 2026-09-24 (the earlier label-suite indigo/emerald repaint was reverted) — `workbench.css` maps its `--wb-*` tokens straight onto these, and its six hardcoded values were tuned against this palette.

## Color

Variable names match their hue again: `--blue-*` is a blue ramp, `--orange-*` an amber/orange ramp.

| Token | Value | Use |
|---|---|---|
| `--blue-500` | `#2C6EBB` | primary brand — links, active nav, `--border-brand` |
| `--blue-700` | `#1B4F9C` | `--action-secondary` / `--text-brand` — secondary buttons, eyebrow text |
| `--orange-400` | `#ED9B26` | `--action-primary` — the one CTA color per page |
| `--orange-500` | `#E37B24` | CTA hover / `--text-accent` (list markers, sparkle icons) |
| `--neutral-900` | `#161C28` | `--text-strong` — the "ink" color for headings/strong text |
| `--surface-page` | `#F6F8FB` | page background (neutral, very faintly blue) |
| `--surface-card` | `#FFFFFF` | card/panel background |
| `--success-500` / `--warning-500` / `--danger-500` / `--info-500` | `#2E9E6B` / `#E3A008` / `#D64545` / `#2C6EBB` | semantic state — always pair with the matching `-50` background, never reuse the accent for warning/danger. `--warning-500` is only 2.26:1 on white; use `--warning-700` (`#9A6600`) for warning **text**. |

Rule: exactly one primary CTA button per page/section (uses `--action-primary`, the orange). Secondary actions use `--action-secondary` (blue) or a ghost/outline style. Don't put two orange buttons side by side.

## Typography

- Headings H1/H2 (`h1, h2` in global.css, or explicit `font-family: var(--font-serif)`): **Crimson Pro**, weight 700. Falls back to `Noto Serif TC` for CJK glyphs (Crimson Pro has no Chinese coverage — this is expected, not a bug).
- H3 and body/UI text: **Inter** via `var(--font-sans)`, falling back to `Noto Sans TC`.
- Code / meta / ids (e.g. an `@ai-visualize` id shown as a caption): `var(--font-mono)` → JetBrains Mono.
- Chinese body copy: keep `line-height: var(--leading-relaxed)` (1.8) — already the project default for `.nc-prose p`.

## Radius & shadow

The scale is tight — resist rounding things more than this, it's what makes the UI read as crisp rather than bubbly.

- `--radius-sm` (3px): chips, small badges, tag pills' inner elements
- `--radius-md` (5px): buttons, inputs
- `--radius-lg` (8px): cards, panels — this is the default for `Card.astro`
- `--radius-xl` (11px): modals, the `GeneratedFrame` viz frame
- `--radius-pill` (999px): pill buttons/tags (already how `Button.astro`/`TagChip.astro` are built)
- `--shadow-sm` / `--shadow-md`: default card/button elevation (navy-tinted, `rgba(17,47,93,…)`)
- `--shadow-card`: a softer wide glow (`0 4px 24px rgba(17,47,93,.10)`) — reach for this instead of `--shadow-md` on a floating/highlighted surface (a toast, or a viz card you want to visually lift). Not an upstream token; defined in this repo.

## Component patterns (for new AI-generated `.tsx`)

Match these shapes when a generated component needs its own button/badge/card rather than importing the Astro ones (Astro components can't be imported into `client:visible` React islands):

```tsx
// primary button
<button style={{
  background: 'var(--action-primary)', color: '#fff', fontWeight: 600,
  padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none',
}}>...</button>

// soft badge / status pill
<span style={{
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '2px 9px', borderRadius: 'var(--radius-full, 9999px)',
  background: 'var(--success-50)', color: 'var(--success-500)',
  fontSize: 11, fontWeight: 600, border: '1px solid transparent',
}}>已生成</span>

// card
<div style={{
  background: 'var(--surface-card)', border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-lg)', padding: 20, boxShadow: 'var(--shadow-card)',
}}>...</div>
```

For charts (`recharts`/`d3`), pull series colors from the ramps in order: `var(--blue-500)` → `var(--orange-400)` → `var(--blue-300)` → `var(--success-500)` — do not introduce a chart palette unrelated to these tokens.

## What NOT to do

- Don't hardcode hex values that already have a token (breaks re-theming if the palette changes again).
- Don't reuse `--orange-*` (the accent) to represent a warning or error state — use `--warning-*` / `--danger-*`. (`Badge.astro`'s `warning` tone used to borrow the accent color; that was a real bug.)
- Don't add a second serif/display font — Crimson Pro is the only display face.
- Don't introduce heavy drop shadows or skeuomorphic gloss — this is a flat-design system; the one permitted "glow" is `--shadow-card`.
