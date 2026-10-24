# Flexible workspace and a restrained multicolor palette

This iteration replaces the predominantly forest-green interface with five accent families on neutral paper. Navy provides the navigation surface; accents distinguish tools and workspace roles rather than coloring every surface.

| Accent | Main color | Light surface | Role |
| --- | --- | --- | --- |
| Blue | `#3654a5` | `#e9eefb` | Primary actions, chat, summaries, data tables |
| Teal | `#266b60` | `#e4f0eb` | Sources, mind maps, success |
| Plum | `#744d8a` | `#f0e8f5` | Studio navigation, quizzes |
| Amber | `#875a1f` | `#fcf0d7` | Flashcards and learning |
| Terracotta | `#9a5137` | `#f8e8df` | Reports and warm notebook accents |

The interface retains conventional error colors and neutral text/borders. Browser verification checks that tool-label foreground/background pairs have contrast of at least 4.5:1 and that the six tools use exactly five accent families. This targeted check is not a full accessibility audit. Earlier forest-color research and screenshots remain historical records of the preceding version.

## Controls

- **Navigation:** use the icon in the top bar or **Seitenleiste minimieren** to collapse the sidebar to a 68-pixel icon strip. All notebook, usage and help actions remain accessible through named icon buttons. Expand it using **Navigation ausklappen**. On phones it opens as a dismissible drawer.
- **Navigation width:** drag its right edge between 176 and 340 pixels. With its separator focused, Left/Right adjust width; Home/End select limits. Enter collapses navigation. Double-click restores 224 pixels.
- **Panel width:** drag the dividers between Sources, Chat and Studio. Adjacent panes share a fixed total while minimum sizes keep their controls usable. Minima adapt when the screen is physically narrower than the normal three-pane layout. Left/Right adjust a focused divider; Shift moves faster; Home/End select its limits. Enter closes its left pane. Double-click restores standard proportions.
- **Close / reopen:** use the X in any panel header, then the **Quellen**, **Chat** or **Studio** toggle above the workspace to reopen it. Closing a panel does not delete data, clear the question draft or change source selection. All three may be closed; the empty view has a **Bereiche wieder öffnen** recovery action.
- **Focus:** the expand icon lets one panel occupy the available workspace. **Mehrere Bereiche zeigen** returns to the previous arrangement. This is independent of browser full-screen mode.
- **Reset:** **Layout zurücksetzen** restores panel visibility and proportions. The navigation width can be restored separately by double-clicking its divider.
- **Persistence:** navigation size/collapse, panel proportions, visibility and focus are saved in this browser under `sourcenote:workspace-layout:v1`, shared across notebooks. Malformed saved settings fall back safely. These are local display preferences, not account or server data.
- **Phones:** the existing Sources/Chat/Studio tabs remain. Closing the active pane switches to another open pane; selecting a tab reopens that pane. Width dragging and focus controls are desktop-only because phones display one pane at a time.

No provider, database schema, paid dependency or hosting plan changes are needed. Resizing and display preferences do not consume AI tokens. The shared preference store uses React's external-store API to retain deterministic server rendering and support storage events across tabs. Pointer capture keeps a drag active beyond the narrow divider, and pointer cancel/loss ends it safely.

## Verification and rollback

Preserved starting branch: `feat/studio-learning-usage` at `d76f7e0860007403d1b7c59509e4b1fe535ee992`.
New branch: `feat/flexible-panels-colors`, pushed before implementation.

Tests cover corrupt preference recovery, width bounds, pointer and keyboard resizing, persistence, full-close recovery, draft retention, desktop breakpoint fitting and the mobile drawer. Existing document, citation, Studio and usage workflows remain in the browser suite. Deterministic test screenshots show their test-mode banner; separately captured public screenshots are explicitly identified as live.

The separator semantics and keyboard behavior follow the [W3C window splitter guidance](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/); no claim is made of complete conformance to every optional interaction in that draft pattern.
