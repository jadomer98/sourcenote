# SourceNote color research and decision

Researched 2026-10-24. Ayham selected **warm paper + forest green** after comparing that direction with charcoal/violet and white/cobalt. The change is on `feat/forest-paper-colors`, created from `feat/sourcenote-implementation` at `28adc4f`. The original branch is preserved and pushed.

## What the references actually support

| Reference | Observed guidance | Applied to SourceNote |
| --- | --- | --- |
| [Anthropic's published brand palette](https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md) | Ivory `#FAF9F5`, near-black `#141413`, restrained earth-toned accents | Warm reading surfaces and dark text; SourceNote uses its own forest accent |
| [Linear brand guidelines](https://linear.app/brand) | Preferred neutral wordmarks; Mercury White `#F4F5F8` and Nordic Gray `#222326`; limited desaturated accent | Separate neutral content surfaces from deliberate interaction colors |
| [Evernote's account of its brand refresh](https://medium.com/taking-note/ever-better-refreshing-the-evernote-brand-f3f28ff12a88) | Restricted green, secondary green, black and white; purposeful negative space | One dominant green family instead of many competing interface accents; this is a historical design reference, not a claim about today's exact app palette |
| [Notion's brand-guideline advice](https://www.notion.com/blog/brand-guidelines-template) | Specify exact color values and document consistent usage | Named CSS roles shared by navigation, chat, dialogs, forms and Studio |
| [Radix Colors: understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) | Distinct roles for surfaces, hover, selection, borders, focus, solid actions and text | Separate semantic tokens rather than one green applied indiscriminately |
| [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | At least 4.5:1 for ordinary text, 3:1 for large text | Measure actual foreground/background pairs, including muted text and selected states |

These are design references, not evidence that a color increases productivity. The SourceNote palette and the dark-sidebar/light-paper combination are our design decisions. No external brand logo, font, illustration, or paid asset was copied.

## Selected palette

| Role | Color | Use |
| --- | --- | --- |
| Paper | `#F6F4ED` | Main workspace canvas |
| Reading surface | `#FFFEFA` | Source, chat, Studio and modal panels |
| Forest | `#215B43` | Primary buttons, references, selections and identity |
| Deep forest | `#173E31` | Navigation rail |
| Ink | `#24352B` | Main text and document excerpts |
| Muted text | `#58685B` | Metadata and secondary copy |
| Sage | `#E5EDDF` | Selected sources, questions and summary cards |
| Ochre | `#805A1F` on `#F4ECD8` | Knowledge checks and small supporting accents |
| Clay | `#925536` on `#F3E6DA` | PDF/note accents |
| Error | `#A3313B` on `#FAE9E6` | Error messages and destructive actions |

Notebook labels retain distinct, quieter sage, clay, blue-green and plum colors. Errors retain their red meaning. Focus indicators use a dedicated green on paper and a light sage ring in the dark rail. Text in the rail has its own light tokens; it does not inherit dark text intended for paper surfaces.

## Implementation and verification

The existing CSS now uses semantic color variables throughout; the previous readability overrides use those same variables. The favicon matches the new forest identity. Layout, source ownership, persistence and provider behavior are unchanged by this color work.

All 8 existing desktop/mobile browser tests passed with the new palette. Representative home/workspace screenshots were visually inspected. A computed-style review then checked 248 visible text occurrences across home, notebook creation, workspace, answer/citations, citation dialog, mobile chat, mobile Studio and the mobile navigation drawer. The lowest sampled contrast was **4.74:1**, with no sampled text failures. Both main-surface and sidebar keyboard focus were visibly styled with solid 3px outlines. [Recorded samples](color-verification.json).

Additional token checks: input borders are **3.08:1** against paper and **3.36:1** against panels; focus colors are **4.78:1** against paper and **8.91:1** against the forest rail. Type/lint, 24 backend/provider tests and the production build passed. On the public forest deployment, actual Groq answer/citation, saved note, summary, reload and mobile Studio checks also passed. `docs/screenshots/live-*.png` now show that public workflow without deterministic test mode.

The review excluded disabled controls, hidden elements and decorative illustrations; modal/drawer checks were limited to the active surface. Token/sample measurements do not constitute a full accessibility audit, and the background approximation does not certify every gradient or composite state.

## Return to the previous version

The original code remains at [feat/sourcenote-implementation](https://github.com/jadomer98/sourcenote/tree/feat/sourcenote-implementation), commit `28adc4f`. Switching to that branch restores the purple design in a local checkout. The previous verified Vercel deployment is `dpl_7hxW77Rvfh2ioLXesbwJBH84TTau`; promoting that deployment restores the prior public version without changing its Git branch. Do not reset or force-push the saved branch.
