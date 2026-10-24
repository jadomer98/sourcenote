# Dark workspace redesign

The supplied NotebookLM reference informed the hierarchy and spacing: a black canvas, charcoal source/Studio surfaces, an open central reading area, a compact global header, and small tool tiles with colored icons. The change addresses available working space, not only the color tokens.

## What changed

- One 70-pixel desktop header contains the notebook title, rename, navigation, panel visibility, new notebook, delete and usage controls. The separate title row and separate layout toolbar no longer occupy vertical space. Smaller screens retain accessible rename/delete controls and the navigation drawer.
- Navigation is closed by default inside a notebook. **Navigation ausklappen** restores the resizable sidebar; collapsing it restores the full workspace width. Home retains compact icon navigation. The new local layout key `sourcenote:workspace-layout:v2` starts this arrangement once, leaving the preceding release's `v1` preferences untouched for rollback. This does not change stored notebooks, source selection, notes or study progress.
- Sources and Studio use rounded charcoal panels. Chat shares the black canvas, with independent scrolling and a compact composer at the bottom. Workspace height flexes within the actual viewport, including error/setup/test banners, instead of subtracting several assumed header heights.
- Sources use 14-pixel names and 16-pixel checkboxes. Answers use 16-pixel text on desktop and at least 15 pixels on phones. The notebook introduction replaces the oversized generic empty-state prompt. It reports the actual source count and stored date; it does not invent an AI summary or make an automatic provider call.
- The question composer is a single-row pill that grows for multiline text, capped at 128 pixels. Enter sends; Shift+Enter adds a line. It shrinks after sending. The source count remains visible on wider panels; phones prioritize the question and send action.
- All six Studio tools remain pinned above the separately scrolling saved-content list. Two-column tiles use colored icons and neutral surfaces, with descriptions available as tooltips/accessibility labels. Cards no longer need 125 pixels each or push creation controls out of view. Saved artifacts have matching icons, accurate kind labels, one-line previews and compact metadata.
- Dialogs, extraction/citation previews, learning tools, tables, usage and owner access, home cards, upload forms, errors, focus outlines, scrollbars and the favicon share the dark palette. Background `#101010`, panels `#202020`, tool tiles `#171717`, main text `#e9e9e7`. Input/output data and exported formats are unchanged.
- Pane resizing, keyboard splitters, focus mode, closing/reopening all panes, draft retention and browser persistence remain available. Visibility buttons moved to the header on desktop; phones retain Sources/Chat/Studio tabs. Closing a panel still never deletes its contents.

The implementation adds no dependency, schema migration, provider configuration or paid service. Display interactions and opening the notebook make no AI calls.

## Verification

Tests exercise actual viewport use at 1280×720, compact/multiline composer bounds, readable answer text, pinned tools after four saved artifacts, mobile rename controls, dark form rendering, no outer-page scrolling, the existing resize/recovery workflows and the original source-to-citation and Studio journeys. Color checks cover five icon-accent families and light tool labels against their real dark backgrounds. These checks are targeted, not a formal accessibility audit.

The live verification record and screenshots are captured separately from deterministic test-provider screenshots. No quota or ingestion protections were disabled to accommodate testing.

## Rollback

Starting branch `feat/flexible-panels-colors` remains at `45c67c9aa552763a1731e23d5f8c9360e9118156`. The new branch `feat/dark-notebook-workspace` was created and pushed before implementation. The preceding light design and its browser layout key remain available from the preserved release. No history was rewritten.
