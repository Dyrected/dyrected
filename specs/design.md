# Dyrected — Live Preview Mode · Design Brief for Google Stitch

> Paste each **Screen** block below into Google Stitch as a separate prompt. Start with the **Design System** block so Stitch anchors the visual language, then generate each screen. Screens are ordered from the primary/default state outward.

---

## Product context (one-liner for Stitch)

A headless CMS visual editor. Content authors edit a document in a schema‑driven form on one side while their real website renders live in an iframe on the other side. Editing a field updates the site instantly; clicking an element in the site jumps the form to the matching field. Modern, calm, developer‑grade tool — think Storyblok / Builder.io / Linear, not a consumer app.

---

## Design System (generate / apply this first)

**Mood:** Calm, precise, premium developer tool. Lots of whitespace, quiet surfaces, one confident accent. No gradients-as-decoration, no drop-shadow clutter. Content and the live website are the heroes; chrome recedes.

**Color** — the admin uses semantic Tailwind design tokens (shadcn-style CSS variables), not raw hexes. Use these exact tokens:
- Page background: `bg-background`; primary text `text-foreground`; muted/secondary text `text-muted-foreground`.
- Surfaces / cards: `bg-card` (or `bg-muted/5`–`bg-muted/10` for quiet fills) with a `border-border/50` hairline.
- Accent / primary action: `bg-primary` / `text-primary-foreground` — used only for the primary button, active states, and focus rings. Active-but-secondary states use `bg-muted` + `text-primary`.
- Hover on quiet controls: `hover:bg-muted/60 hover:text-foreground`.
- Status — Draft: `bg-amber-100 text-amber-700 border-amber-200`. Live/Published: `bg-emerald-100 text-emerald-700 border-emerald-200`.
- Read-only banner: `bg-amber-50 border-amber-200 text-amber-800`.
- Errors / destructive: `bg-destructive/10 border-destructive/20 text-destructive` (badge: `bg-destructive text-destructive-foreground`).

**Typography**
- UI: Inter / geometric sans. Small labels, uppercase micro-labels with wide tracking (`font-bold uppercase tracking-wider text-muted-foreground/50`) for metadata headers.
- Page title: serif display (`font-serif font-bold tracking-tight`), editorial feel.
- IDs / code chips: monospace (`font-mono`).

**Shape**
- Radius: cards & inputs `rounded-xl` / `rounded-2xl`, pills & badges `rounded-full`, rail buttons `rounded-xl`.
- Hairline `border-border/50` borders instead of shadows for structure. Soft shadow (`shadow-xl` + `backdrop-blur`) only on floating/sticky bars.

**Iconography:** Lucide, 16px (`h-4 w-4`), monochrome. Real icons used in the app: `Save`, `Plus`, `Workflow`, `Settings2`, `Info`, `Mail`, `ChevronLeft`, `ChevronRight`, `ChevronDown`, `Home`, `GripVertical`, `AlertCircle`, `Lock`, `Archive`, `MousePointer2` (Edit Mode), `RotateCcw` (reload), `Monitor` / `Smartphone` (device toggle), `ExternalLink`, `Eye` / `Pencil` (mobile Edit⇄Preview).

**Motion:** 300–500ms ease transitions when panes resize; subtle slide-in-from-bottom + fade for sticky bars.

---

## Screen 1 — Preview Mode, default split view (the flagship screen)

Full-height, edge-to-edge, three vertical regions left → right:

1. **Live Preview pane (left, dominant, ~65% width).** An iframe showing the author's real website page. A thin top toolbar inside it: a reload icon-button (`RotateCcw`) and a device toggle (`Monitor` / `Smartphone`) and open-in-new (`ExternalLink`) on the left; on the right an **Edit Mode** toggle button (`MousePointer2`) — active by default (shown in accent). The website content below fills the pane. In edit mode, one element in the rendered page shows a **hover highlight**: a 2px accent outline with a tiny floating label reading the field name (e.g. "hero.heading"). The pane has a hairline right border.

2. **Form column (middle, deliberately narrow, ~20–25% width).** Header row: a back chevron (`ChevronLeft`), a serif page title "Edit Page", and a small pill status badge ("Draft", amber). Below, a compact tab bar (pills) — e.g. "Page", "SEO", "Settings" — with an overflow "More ▾" (`ChevronDown`) dropdown when they don't fit. Under it, form fields stacked with small labels: a text input ("Slug"), a rich-text field, and a **Blocks field** rendered as a vertical list of block cards (each card: drag handle `GripVertical`, block name, a drill-in chevron `ChevronRight`, subtle border). An "+ Add Block" (`Plus`) button. The column scrolls independently.

3. **Vertical action rail (far right, fixed 64px).** A column of icon+label buttons, each a stacked 16px icon over a 10px label, centered:
   - **Save** (`Save`, primary — filled accent, top)
   - **New** (`Plus`)
   - a hairline divider
   - **Workflow** (`Workflow`, toggle)
   - **View** (`Settings2`)
   - **Info** (`Info`, opens a popover)
   The rail has a hairline left border and a muted background.

The overall admin's left navigation sidebar is **collapsed** in this mode (not shown) to give the split room. Emphasize the calm balance: website is the star, the form is a focused side panel, the rail is quiet.

---

## Screen 2 — Drilled into a block (nested editing)

Same split layout as Screen 1, but the **form column** has changed:
- The tab bar is **hidden**.
- At the top of the column sits a **breadcrumb**: `⌂ Content › Hero › Buttons` — a home icon (`Home`) leads, crumbs separated by `ChevronRight`; intermediate crumbs are clickable/muted, the last crumb is bold foreground.
- Below the breadcrumb, only the fields of the drilled-in block are shown (e.g. Heading, Subheading, a nested "Buttons" array with its own add/remove). No sibling blocks visible.
- In the **live preview**, the corresponding block on the page is highlighted/selected (accent outline), showing the link between the drilled-in form and the rendered element.

Convey: focus mode — the author is deep inside one component, with a clear trail back out.

---

## Screen 3 — Click-to-edit interaction (hover + jump)

A moment-in-time frame of Screen 1 emphasizing the click-to-edit affordance:
- In the live preview, the author's cursor hovers a testimonial quote; that element has a crisp accent outline and a small floating tag "testimonial.quote".
- Simultaneously, in the form column, the matching field is **focused** (accent focus ring) and scrolled into view, with the breadcrumb reflecting the drilled-in block.
Show the two sides visually connected (e.g. a subtle motion/emphasis linking the highlighted element to the focused input).

---

## Screen 4 — Dirty state with sticky save bar

Screen 1 with unsaved changes: a **floating sticky bar** pinned to the bottom of the form column — a rounded, blurred/translucent surface with soft shadow, a left label "You have unsaved changes", and a filled accent **Save Changes** button with a save icon on the right. Slides up with a subtle animation.

---

## Screen 5 — Validation errors

Screen 1 with an **error summary panel** at the top of the form column: a soft red-tinted rounded card (`bg-destructive/10`), an alert icon (`AlertCircle`) + "Please resolve the following validation errors:", then a bulleted list of clickable errors like "Page > Hero > Heading: This field is required." Affected tabs in the tab bar show a small red count badge (`bg-destructive text-destructive-foreground`). Clicking a listed error would jump to and focus that field (show one error hovered/underlined).

---

## Screen 6 — Preview OFF (plain full-width form)

The same document, but preview is toggled off. Now the **form takes the full center width** (max ~4xl, centered), no iframe. The Blocks field renders as a normal **inline flat list** (each block expanded inline rather than drill-in). The rail remains on the right; the admin's left navigation sidebar is **restored/expanded**. Roomy, comfortable single-column editing.

---

## Screen 7 — Mobile, Edit pane (< lg)

Single column on a phone. The form fills the screen. The **action rail is a compact bottom or right strip** containing an **Edit ⇄ Preview** segmented toggle (`Pencil` / `Eye` icons) plus Save. Currently showing the **Edit** (form) pane: header, tabs as an accordion (collapsible sections), fields stacked. Optimize field density and tap targets for touch.

---

## Screen 8 — Mobile, Preview pane (< lg)

Same phone, toggled to **Preview**: the live website iframe fills the screen full-width; the Edit ⇄ Preview toggle shows "Edit" as the way back. Tapping an element in the preview should return to the form pane with that field focused (indicate this affordance).

---

## Screen 9 — Workflow panel open (optional/secondary)

Screen 1 variant where a **Workflow sidebar** (~288px) appears to the left of the rail: a vertical stepper of workflow states (e.g. Draft → In Review → Published) with the current state highlighted, assignee avatars, and action buttons ("Submit for review", "Approve"). Note the space tension — this competes with the preview; design it to coexist gracefully (e.g. collapsible, or preview narrows).

---

## Cross-cutting states to include for any screen

- **Loading:** skeleton shimmer in the form and a spinner/placeholder in the preview iframe.
- **Read-only / no permission:** an amber inline banner (`bg-amber-50 border-amber-200 text-amber-800`, icon `Archive`) "You have read-only access"; primary actions disabled.
- **Empty preview:** iframe placeholder when no `previewUrl` is resolvable.
- **Dark mode** variants of the flagship split screen.

---

## Design tensions to explore (creative direction for the designer)

- The form column is intentionally narrow (~1/5–1/4). Solve for **compact but legible** fields, tab overflow, and rich-text usability at that width.
- Three navigation surfaces coexist — the **rail**, the **breadcrumb**, and the preview **toolbar**. Consider unifying or clarifying their roles.
- Strengthen the **click-to-edit** language: how a hovered element signals "editable", the selected treatment, and the visual link to the focused field.
- Mobile is currently a functional toggle — design it as a first-class experience, not an afterthought.
- Reduce visual busyness from stacked vertical dividers (preview | form | rail | optional workflow).
