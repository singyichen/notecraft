---
name: lecture-to-notes
description: Use when expanding an existing course note from classroom audio, live transcription, transcript_tail_flush fragments, screenshots, or mixed lecture records.
---

# Lecture to Notes

Turn classroom evidence into organized knowledge inside the existing note. The deliverable is a deduplicated, source-aware note—not a transcript.

## Source gate

Before editing, identify the target note, every user-designated source, and how complete each source is.

`transcript_tail_flush` contains only the buffered tail. Never treat it as the whole lecture. Check earlier content in the current conversation and any source the user explicitly named before asking for a resend. Do not reclassify current-conversation material as another conversation without evidence.

Partial evidence may support a local addition. State the gap and omit claims that depend on missing context. Preserve raw transcripts only when the user requests them or provenance requires retention.

## Differential integration

1. Read applicable project instructions, the complete target note, and its `git diff`. Preserve all user changes.
2. Separate traceable classroom content from existing-note content and external background. Extract new teaching value: explanations, examples, engineering intuition, misconceptions, schedule or announcements, formula details, and lab guidance.
3. Compare each item with the note:

| Comparison | Action |
| --- | --- |
| Already complete | Do not rewrite it |
| Same concept, new teaching value | Add it beside the existing explanation |
| New topic | Insert it in the matching section |
| Uncertain or context-dependent | Rewrite without relying on the doubtful term, mark for confirmation, or omit |

Do not append a chronological transcript dump. Remove fillers, false starts, and repetitions. Correct ASR errors only when context, visible material, or course terminology makes the correction high-confidence. Never present reconstructed prose as a verbatim quote.

Use external sources only to verify terminology or facts. Label externally supplied background distinctly from what the teacher said.

## Example

An existing section already explains Kilby and Noyce. A live transcript adds that one diagram uses flying wires at different heights while the other routes metal along the surface. Extend that section with the three-dimensional-versus-planar intuition and skip repeated history; do not create a transcript appendix or preserve an uncertain token such as “PMP” without confirmation.

## Completion contract

- Re-read the edited sections for provenance, duplicates, and placement.
- Check MDX syntax and run `git diff --check` plus the project’s applicable build or check command.
- Report what was added, what was omitted and why, and the verification result.
- Do not commit, push, or change unrelated files without explicit authorization.
