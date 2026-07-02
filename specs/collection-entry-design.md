# Dyrected — Collection Entry Editor · Design Brief

> Two screens to design, for Google Stitch. Paste the **Design System** block first, then generate **Screen A** (a single collection entry with live preview), then **Screen B** (the same entry after navigating into a block). Screen B is a state change of Screen A — keep them visually identical except where noted.

---

## Context (one line for Stitch)

A headless CMS visual editor. An author edits **one document** (a "Page") in a schema‑driven form while their real website renders live in an iframe beside it. Editing a field updates the site instantly. Calm, precise, developer‑grade — think Linear / Storyblok, not a consumer app.

---

## Design System (apply first)

**Mood:** Quiet, premium, content-first. Whitespace over chrome. One confident accent. Hairline borders instead of shadows. Support light and dark.

**Color**
- Background `#FBFBFA` light / `#0B0B0C` dark.
- Surfaces: white cards, `1px` borders at `rgba(0,0,0,0.08)`, muted fills at 5–10% opacity.
- Text: primary `#1A1A1A`, muted `#6B6B6B`, subtle `#9A9A9A`.
- Accent (primary action, active state, focus ring): deep indigo `#4F46E5`.
- Status pills: Draft = amber `#B45309` on `#FEF3C7`; Live = emerald `#047857` on `#D1FAE5`.

**Type**
- UI: Inter. Field labels 12–13px. Micro-labels 10px uppercase, wide tracking, subtle color (for metadata).
- Page title: serif display, ~18px bold (editorial).
- IDs / paths: monospace.

**Shape & motion**
- Radius: inputs & cards `12px`, pills `full`.
- Soft shadow only on floating/sticky bars. Structure via hairlines.
- 300–500ms ease on pane resize; slide-up + fade for sticky bars.

**Icons:** Lucide, 16px, 1.5px stroke, monochrome.

---

## Screen A — Single collection entry (edit page, live preview on)

Full-height, edge-to-edge. Three vertical regions, left → right:

### 1 · Live Preview pane — LEFT, dominant (~65% width)
An iframe rendering the author's real website page (a marketing landing page: hero, features, testimonial, CTA). A thin toolbar across the top of the pane:
- left: a small circular **reload** icon-button.
- right: an **Edit Mode** toggle button (cursor/pointer icon + label), shown **active** in accent — it's on by default.

Below the toolbar, the rendered site fills the pane. Hairline border on the right edge. The website is the visual hero of the screen.

### 2 · Form column — MIDDLE, intentionally narrow (~22% width), scrolls independently
Top to bottom:
- **Header row:** a back chevron button, a serif title "**Edit Page**", and a small pill **status badge** "Draft" (amber). Thin bottom divider.
- **Tab bar:** small pill tabs — `Page` (active), `SEO`, `Settings` — inside a muted rounded track. An overflow "**More ▾**" pill appears if they don't fit.
- **Fields** (in the active "Page" tab), stacked with 12px labels:
  - a **Slug** text input.
  - a **Title** text input.
  - a **Layout** field rendered as a **Blocks list** — a vertical stack of **block cards**. Each card: a left drag-handle (grip dots, muted), the block's name in semibold (e.g. "Hero", "Features", "Testimonial", "Call to Action"), a small type/subtitle line, and a right-side **chevron ›** indicating you can drill in. Cards have hairline borders and a subtle hover lift.
  - a dashed "**+ Add Block**" button below the list.

### 3 · Action rail — FAR RIGHT, fixed 64px
A quiet vertical column of icon+label buttons (16px icon stacked over a 10px centered label). Hairline left border, muted background. Top to bottom:
- **Save** — primary, filled accent.
- **New** — plus icon.
- hairline divider.
- **Workflow** — branch icon.
- **View** — sliders icon.
- **Info** — i icon (opens a small popover with document ID + created/updated timestamps).

**Overall feel:** the site is the star; the form is a focused, compact side panel; the rail is a calm tool strip. The app's global left nav sidebar is **collapsed/absent** here to give the split room.

---

## Screen B — Navigated into a block (drill-in editing)

**Identical layout to Screen A.** Only the **form column (region 2)** changes, and the preview reflects the selection. The author clicked the "Hero" block card (or clicked the hero in the live site), and the form drilled into it.

### Form column now shows:
- **The tab bar is hidden.** In its place, at the very top of the column, a **breadcrumb trail**:
  `⌂ Content  ›  Hero  ›  Buttons`
  - The home icon (`⌂ Content`) and intermediate crumbs are muted and clickable (they navigate back out).
  - The last crumb ("Buttons") is bold, foreground color — the current level.
  - Chevron separators between crumbs.
- **Only the drilled-in block's fields** are shown — no sibling blocks:
  - **Heading** text input.
  - **Subheading** textarea.
  - **Buttons** — a nested array field: a small stack of item rows (each with its own drill/expand + remove), and an "+ Add Button" control.
- The Save / sticky-bar behavior is unchanged.

### Live preview now shows:
- The **Hero block on the rendered page is selected**: a crisp 2px accent outline around it, with a small floating tag reading `layout.0.heading` near the focused element. This visually links the drilled-in form to the exact element on the site.

**Feel:** focus mode. The author is deep inside one component with a clear, tappable trail back to the top level. Everything else (preview, rail) stays put so the context never jumps.

---

## Notes for the designer
- The form column is deliberately ~1/5–1/4 wide. Solve for **compact but legible** fields, comfortable tap/click targets, and graceful tab overflow.
- Make the **drill-in transition** feel like descending one level (breadcrumb appears, tab bar recedes) — not like navigating to a different screen. The preview must not reload or move.
- Strengthen the **click-to-edit** link between a highlighted site element and its focused field — the hover outline, the floating path tag, and the focus ring should read as one connected gesture.
- Provide **light and dark** versions of both screens.
