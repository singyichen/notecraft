---
name: notecraft-design
description: NoteCraft 自身的視覺設計系統（改編自 label-suite 的 indigo/emerald 配色與 Crimson Pro + Inter 字體）。AI 視覺化 / 簡報生成元件在決定色票、字級、圓角、陰影時應先讀這份文件，優先使用專案既有 CSS 變數與 class，不要硬編色碼。
user-invocable: true
---

Read this file before generating any visual component for NoteCraft (`content-visualize` / `content-present` skills, `component-generator` / `slide-generator` subagents). It documents the *actual* design tokens shipped in this repo — do not invent parallel color names or hardcode hex values that already have a token.

## Source of truth

- `src/styles/tokens.css` — canonical CSS variables (colors, type, radius, shadow, motion). **Always read this file** to confirm current values; this SKILL.md summarizes it but the CSS file wins if they ever disagree.
- `tailwind.config.mjs` — maps the CSS variables onto Tailwind's `blue` / `orange` / `neutral` color scales and `fontFamily.sans` / `.serif` / `.mono`.
- Reference component code: `src/components/Button.astro`, `Card.astro`, `Badge.astro`, `TagChip.astro` — copy their inline-style pattern (`style={...var(--token)...}`) rather than Tailwind utility classes when writing new `.astro`/`.tsx` in this repo, since that's the established convention here.

## Brand in one breath

Adapted from [label-suite](../../.claude — sibling project, not shipped in this repo)'s design system: academic / research-tool mood — indigo primary, emerald accent, a serif display face for headings against an otherwise clean sans-serif UI. Softer, larger corner radii than a typical SaaS dashboard; shadows are subtle and carry a faint indigo tint rather than pure black. No skeuomorphic gradients except the sidebar's brand gradient and the primary-button's (near-flat, two adjacent emerald stops) accent gradient.

## Color

CSS variables carry historical names (`--blue-*`, `--orange-*`) but now hold an **indigo** ramp and an **emerald** ramp respectively — don't be misled by the literal names, read the hex.

| Token | Value | Use |
|---|---|---|
| `--blue-500` | `#6366F1` (indigo) | primary brand — links, secondary buttons, active nav |
| `--blue-950` | `#1E1B4B` | `--text-strong` — the "ink" color for headings/strong text |
| `--orange-500` | `#10B981` (emerald) | `--action-primary` — the one CTA color per page |
| `--orange-600` | `#059669` | CTA hover / `--text-accent` (eyebrows, list markers, sparkle icons) |
| `--neutral-*` | slate scale | borders, muted text, sunken surfaces |
| `--surface-page` | `#F5F3FF` | page background (violet-tinted, **not** neutral gray) |
| `--surface-card` | `#FFFFFF` | card/panel background |
| `--success-500` / `--warning-500` / `--danger-500` / `--info-500` | `#15803D` / `#A16207` / `#B91C1C` / `#1D4ED8` | semantic state text — always pair with the matching `-50` background, never reuse the accent (emerald) for warning/danger |

Rule: exactly one primary CTA button per page/section (uses `--action-primary`). Secondary actions use `--action-secondary` (indigo) or a ghost/outline style. Don't put two `--orange-500` (emerald) buttons side by side.

## Typography

- Headings H1/H2 (`h1, h2` in global.css, or explicit `font-family: var(--font-serif)`): **Crimson Pro**, weight 700. Falls back to `Noto Serif TC` for CJK glyphs (Crimson Pro has no Chinese coverage — this is expected, not a bug).
- H3 and body/UI text: **Inter** via `var(--font-sans)`, falling back to `Noto Sans TC`.
- Code / meta / ids (e.g. an `@ai-visualize` id shown as a caption): `var(--font-mono)` → JetBrains Mono.
- Chinese body copy: keep `line-height: var(--leading-relaxed)` (1.8) — already the project default for `.nc-prose p`.

## Radius & shadow

- `--radius-sm` (4px): chips, small badges, tag pills' inner elements
- `--radius-md` (8px): buttons, inputs
- `--radius-lg` (12px): cards, panels — this is the default for `Card.astro`
- `--radius-xl` (16px): modals, the `GeneratedFrame` viz frame
- `--radius-pill` (9999px): pill buttons/tags (already how `Button.astro`/`TagChip.astro` are built)
- `--shadow-sm` / `--shadow-md`: default card/button elevation
- `--shadow-card`: the indigo-tinted glow (`0 4px 24px rgba(99,102,241,.10)`) — reach for this instead of `--shadow-md` on a floating/highlighted surface (e.g. a toast, or a viz card you want to visually lift) when you want the label-suite "glow" rather than a flat gray shadow.

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

For charts (`recharts`/`d3`), pull series colors from the ramps in order: `var(--blue-500)` (indigo) → `var(--orange-500)` (emerald) → `var(--blue-300)` → `var(--warning-500)` — do not introduce a chart palette unrelated to these tokens.

## What NOT to do

- Don't hardcode hex values that already have a token (breaks re-theming if the palette changes again).
- Don't reuse `--orange-*` (emerald/accent) to represent a warning or error state — use `--warning-*` / `--danger-*`. (This was a real bug fixed during the label-suite migration: `Badge.astro`'s `warning` tone used to borrow the accent color.)
- Don't add a second serif/display font — Crimson Pro is the only display face.
- Don't introduce heavy drop shadows or skeuomorphic gloss — label-suite is a flat-design system; the one permitted "glow" is `--shadow-card`.
