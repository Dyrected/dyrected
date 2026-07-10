# Review Packet — managing-data/displaying-content/overview.mdx

## Document purpose

Reference-led guide (with a light conceptual frame): teach the reader which framework
components Dyrected ships for rendering fetched fields (`DyrectedImage`, `DyrectedMedia`,
`DyrectedIcon`, `DyrectedRichText`, `Blocks`) and which package/name to import in React,
Vue, Next, and Nuxt.

**Reader outcome:** after this page a reader should know that field-rendering helpers are
presentational (no provider/network needed), which helper to reach for per field type, the
one or two important props of each, and how imports/naming differ across the four frameworks.

## Payload equivalent

**No clean 1:1 equivalent.** Payload is frontend-agnostic and does not ship framework
presentational components for uploads/icons/blocks. The nearest structural cousins are
Payload's Lexical rich-text converters (`payloadcms.com/docs/rich-text/converting-jsx`) and
Local API rendering examples. Structure was therefore taken from Payload's general
"concept → minimal usage → per-option detail → cross-cutting reference table" shape rather
than a single page. Reported as a gap per the batch instructions.

## Source inventory

| Source | Why it matters | Trust |
|---|---|---|
| `packages/react/src/components/{DyrectedImage,DyrectedMedia,DyrectedIcon,DyrectedRichText,Blocks}.tsx` | Canonical prop/behavior truth for React & re-exported to Next | High |
| `packages/next/src/{index.ts, components/DyrectedImage.tsx, components/DyrectedMedia.tsx}` | Confirms Next-specific `next/image` wrapping; confirms Icon/RichText/Blocks are re-exports | High |
| `packages/vue/src/index.ts`, `packages/vue/src/components/*.vue`, `Blocks.ts` | Vue exports, prop parity, plain `<img>` in base Vue | High |
| `packages/nuxt/src/module.ts`, `packages/nuxt/src/runtime/components/*.vue` | Auto-import names, `<DyrectedBlocks>` registration, `@nuxt/image` install, `<NuxtImg>` | High |
| `apps/docs/DOCS_PHILOSOPHY.md` | Voice/structure standard | High |

## What changed in this pass

1. **Reordered sections** so Rich text moves from after the reference table to alongside
   the other component sections (Images → Icons → Rich text → Blocks → reference table).
   This restores the philosophy's progressive-depth order (teach each component, then
   provide the cross-framework reference).
2. **Intro enumeration** now includes rich text ("images, icons, rich text, and block
   layouts") — it was previously omitted despite having a helper.
3. Prose otherwise preserved — it already fit the docs philosophy.

## Verification — every factual claim checked against source (all CONFIRMED)

| Claim | Verdict | Evidence |
|---|---|---|
| `DyrectedImage` prop is `media`, accepts hydrated doc **or** URL string | Confirmed | react `DyrectedImage.tsx:5,11,23`; next `:7,22` |
| Image pulls width/height/alt from the doc | Confirmed | react `:26-28`; next `:37-39` |
| Next uses `next/image`; base React/Vue use plain `<img>` | Confirmed | next `:2,24`; react `:13,24`; vue `DyrectedImage.vue:2-17` |
| `DyrectedMedia` inspects `mimeType`, has `fallback`, accepts URL string, handles video/YouTube | Confirmed | react `DyrectedMedia.tsx:9,18,19,22-35,57` |
| `DyrectedIcon` resolves Lucide by `name`, forwards Lucide props, `fallback` (no default) | Confirmed | react `DyrectedIcon.tsx:5,10,18,35,40` |
| `DyrectedRichText` prop `content`, renders HTML via `dangerouslySetInnerHTML`, no sanitization; `className` flows via prop spread | Confirmed | react `DyrectedRichText.tsx:3,8,24` |
| `Blocks` props `items` + `components` map; `path` defaults to `"body"`; wraps items for live-preview path scoping | Confirmed | react `Blocks.tsx:19,21,34,41` |
| `@dyrected/next` re-exports Icon/RichText/Blocks from react; only Image/Media are Next-specific | Confirmed | next `index.ts:19-28` |
| Vue exports all five from `@dyrected/vue`; blocks named `Blocks` | Confirmed | vue `index.ts:2-8` |
| Nuxt auto-imports all; `Blocks` registered as `<DyrectedBlocks>`; installs `@nuxt/image`; runtime Image/Media use `<NuxtImg>` | Confirmed | nuxt `module.ts:55,84-121`; runtime `DyrectedImage.vue:1-9`, `DyrectedMedia.vue:16-23` |
| Internal links (`sdk-api/overview`, `fields/{image,icon,blocks,rich-text}`) resolve in new-docs | Confirmed | file existence check |

## Uncertainty register / questions for human review

- **No `NEEDS-HUMAN-VERIFY` markers remain** — all claims traced to source.
- **Editorial only:** `DyrectedMedia` also auto-embeds YouTube URLs as an iframe. The page
  says it renders "a video, a YouTube link, or a downloadable document," which covers this,
  but does not show a YouTube example. Confirm whether a YouTube example is wanted, or leave
  the one-line mention as-is (recommended — keeps the page tight).
- **Editorial only:** `DyrectedIcon.fallback` has no default; if `name` doesn't resolve and
  no fallback is given, the component renders nothing. The page correctly advises passing a
  fallback but doesn't state the "renders nothing" behavior. Add a half-sentence, or leave.
- No JSDoc/generator changes needed — this page contains no `@dyrected/knowledge` generated
  reference block.

## Status

**Draft ready for review.** Factually verified against package source; structurally adjusted
for progressive depth. Remaining items are editorial judgment calls for a human, not accuracy
gaps.
