import type { Field as FieldSchema } from "@dyrected/sdk"

export type CompareGroup =
  | "Text changes"
  | "Media changes"
  | "Layout / sections changed"
  | "Settings changed"

export type CompareStatus = "Changed" | "Added" | "Removed"

export interface CompareCard {
  id: string
  group: CompareGroup
  label: string
  status: CompareStatus
  path: string
  kind: "text" | "richText" | "media" | "array" | "setting"
  liveValue: unknown
  draftValue: unknown
  liveText: string
  draftText: string
  liveMedia?: CompareMediaPreview | null
  draftMedia?: CompareMediaPreview | null
}

export interface CompareMediaPreview {
  url: string | null
  filename: string | null
  alt: string | null
}

export interface DraftLiveComparison {
  hasPublishedVersion: boolean
  hasChanges: boolean
  fieldChangeCount: number
  sectionsAdded: number
  sectionsRemoved: number
  groups: Array<{
    title: CompareGroup
    cards: CompareCard[]
  }>
}

const GROUP_ORDER: CompareGroup[] = [
  "Text changes",
  "Media changes",
  "Layout / sections changed",
  "Settings changed",
]

const SYSTEM_KEYS = new Set([
  "id",
  "_workflow",
  "__workflow",
  "__published",
  "createdAt",
  "createdBy",
  "updatedAt",
  "updatedBy",
  "password",
  "oldPassword",
  "newPassword",
  "confirmPassword",
])

export function buildDraftLiveComparison(args: {
  fields: FieldSchema[]
  draft: Record<string, unknown> | null | undefined
  live: Record<string, unknown> | null | undefined
}): DraftLiveComparison {
  const draft = args.draft ?? {}
  const live = args.live ?? {}
  const cards: CompareCard[] = []
  const counters = { sectionsAdded: 0, sectionsRemoved: 0 }

  compareFields({
    fields: args.fields,
    draft,
    live,
    pathPrefix: "",
    cards,
    counters,
  })

  const groups = GROUP_ORDER.map((title) => ({
    title,
    cards: cards.filter((card) => card.group === title),
  })).filter((group) => group.cards.length > 0)

  return {
    hasPublishedVersion: !isStructurallyEmpty(live),
    hasChanges: cards.length > 0,
    fieldChangeCount: cards.length,
    sectionsAdded: counters.sectionsAdded,
    sectionsRemoved: counters.sectionsRemoved,
    groups,
  }
}

function compareFields(args: {
  fields: FieldSchema[]
  draft: Record<string, unknown> | null
  live: Record<string, unknown> | null
  pathPrefix: string
  cards: CompareCard[]
  counters: { sectionsAdded: number; sectionsRemoved: number }
}) {
  const draftRecord = args.draft ?? {}
  const liveRecord = args.live ?? {}

  for (const field of args.fields) {
    if (!field?.name || SYSTEM_KEYS.has(field.name) || field.admin?.hidden) continue

    const path = args.pathPrefix ? `${args.pathPrefix}.${field.name}` : field.name
    const draftValue = draftRecord[field.name] as unknown
    const liveValue = liveRecord[field.name] as unknown

    if (field.type === "object" && Array.isArray(field.fields)) {
      compareFields({
        fields: field.fields as FieldSchema[],
        draft: asRecord(draftValue),
        live: asRecord(liveValue),
        pathPrefix: path,
        cards: args.cards,
        counters: args.counters,
      })
      continue
    }

    if (field.type === "array" || field.type === "blocks") {
      compareArrayField({
        field,
        path,
        draftValue,
        liveValue,
        cards: args.cards,
        counters: args.counters,
      })
      continue
    }

    if (deepEqual(draftValue, liveValue)) continue

    args.cards.push(buildCard({
      field,
      label: field.label || humanizeKey(field.name),
      path,
      draftValue,
      liveValue,
    }))
  }
}

function compareArrayField(args: {
  field: FieldSchema
  path: string
  draftValue: unknown
  liveValue: unknown
  cards: CompareCard[]
  counters: { sectionsAdded: number; sectionsRemoved: number }
}) {
  const draftItems = Array.isArray(args.draftValue) ? args.draftValue : []
  const liveItems = Array.isArray(args.liveValue) ? args.liveValue : []
  const max = Math.max(draftItems.length, liveItems.length)

  for (let index = 0; index < max; index += 1) {
    const draftItem = draftItems[index]
    const liveItem = liveItems[index]
    if (deepEqual(draftItem, liveItem)) continue

    const label = describeArrayItem(args.field, draftItem, liveItem, index)
    const status = resolveStatus(liveItem, draftItem)

    if (status === "Added") args.counters.sectionsAdded += 1
    if (status === "Removed") args.counters.sectionsRemoved += 1

    args.cards.push({
      id: `${args.path}.${index}`,
      group: "Layout / sections changed",
      label,
      status,
      path: `${args.path}.${index}`,
      kind: "array",
      liveValue: liveItem,
      draftValue: draftItem,
      liveText: summarizeArrayItem(liveItem),
      draftText: summarizeArrayItem(draftItem),
    })
  }
}

function buildCard(args: {
  field: FieldSchema
  label: string
  path: string
  draftValue: unknown
  liveValue: unknown
}): CompareCard {
  const kind = resolveKind(args.field, args.draftValue, args.liveValue)
  const status = resolveStatus(args.liveValue, args.draftValue)
  const liveMedia = kind === "media" ? extractMediaPreview(args.liveValue) : null
  const draftMedia = kind === "media" ? extractMediaPreview(args.draftValue) : null

  return {
    id: args.path,
    group: resolveGroup(args.field, kind),
    label: args.label,
    status,
    path: args.path,
    kind,
    liveValue: args.liveValue,
    draftValue: args.draftValue,
    liveText: formatValueForPreview(args.liveValue, kind),
    draftText: formatValueForPreview(args.draftValue, kind),
    liveMedia,
    draftMedia,
  }
}

function resolveKind(field: FieldSchema, draftValue: unknown, liveValue: unknown): CompareCard["kind"] {
  if (field.type === "richText" || field.type === "json") return "richText"
  if (field.type === "image" || isMediaLike(draftValue) || isMediaLike(liveValue)) return "media"
  if (field.type === "relationship" && (((field as { hasMany?: boolean }).hasMany) || Array.isArray(draftValue) || Array.isArray(liveValue))) {
    return "array"
  }
  if (isLikelySettingField(field)) return "setting"
  return "text"
}

function resolveGroup(field: FieldSchema, kind: CompareCard["kind"]): CompareGroup {
  if (kind === "media") return "Media changes"
  if (kind === "array") return "Layout / sections changed"
  if (kind === "setting" || isLikelySettingField(field)) return "Settings changed"
  return "Text changes"
}

function resolveStatus(liveValue: unknown, draftValue: unknown): CompareStatus {
  if (isStructurallyEmpty(liveValue) && !isStructurallyEmpty(draftValue)) return "Added"
  if (!isStructurallyEmpty(liveValue) && isStructurallyEmpty(draftValue)) return "Removed"
  return "Changed"
}

function describeArrayItem(field: FieldSchema, draftItem: unknown, liveItem: unknown, index: number) {
  const sample = asRecord(draftItem) || asRecord(liveItem)
  if (field.type === "blocks") {
    const blockType = typeof sample?.blockType === "string" ? sample.blockType : null
    const blockLabel = blockType
      ? ((field as { blocks?: Array<{ slug: string; labels?: { singular?: string } }> }).blocks?.find((block) => block.slug === blockType)?.labels?.singular ?? humanizeKey(blockType))
      : `Section ${index + 1}`
    return blockLabel.includes("section") || blockLabel.includes("Section")
      ? blockLabel
      : `${blockLabel} section`
  }

  const title = extractTitle(sample)
  if (title) return title
  const singular = field.label?.replace(/s$/, "") || "Section"
  return `${singular} ${index + 1}`
}

function summarizeArrayItem(value: unknown): string {
  if (isStructurallyEmpty(value)) return "No content"
  const record = asRecord(value)
  if (!record) return formatValueForPreview(value, "text")

  const summaryParts: string[] = []
  const title = extractTitle(record)
  if (title) summaryParts.push(title)

  const textSnippet = extractTextContent(record)
  if (textSnippet && textSnippet !== title) summaryParts.push(textSnippet)

  if (summaryParts.length === 0) {
    const keys = Object.keys(record).filter((key) => !SYSTEM_KEYS.has(key))
    if (keys.length > 0) summaryParts.push(`${keys.length} fields`)
  }

  return summaryParts.join(" • ") || "No content"
}

function formatValueForPreview(value: unknown, kind: CompareCard["kind"]): string {
  if (isStructurallyEmpty(value)) return "Empty"
  if (kind === "media") {
    const media = extractMediaPreview(value)
    return media?.filename || media?.url || media?.alt || "Media updated"
  }

  if (kind === "richText") {
    const text = extractTextContent(value)
    return text || "Rich text updated"
  }

  if (Array.isArray(value)) {
    return value.map((item) => summarizeArrayItem(item)).filter(Boolean).slice(0, 3).join("\n") || `${value.length} items`
  }

  if (typeof value === "object") {
    const text = extractTextContent(value)
    return text || JSON.stringify(value)
  }

  return String(value)
}

function extractMediaPreview(value: unknown): CompareMediaPreview | null {
  const record = asRecord(value)
  if (!record) return null
  const filename = readString(record.filename) || readString(record.name)
  const url = readString(record.url) || readString(record.src)
  const alt = readString(record.alt) || readString(record.caption)
  if (!filename && !url && !alt) return null
  return { filename, url, alt }
}

function isMediaLike(value: unknown) {
  const media = extractMediaPreview(value)
  return !!media
}

function isLikelySettingField(field: FieldSchema) {
  const source = `${field.name ?? ""} ${field.label ?? ""}`.toLowerCase()
  return ["status", "slug", "seo", "settings", "theme", "variant", "url", "path", "template"].some((token) =>
    source.includes(token),
  )
}

function extractTitle(value: Record<string, unknown> | null) {
  if (!value) return ""
  const candidates = ["title", "heading", "headline", "label", "name", "question", "slug"]
  for (const key of candidates) {
    const next = readString(value[key])
    if (next) return next
  }
  return ""
}

function extractTextContent(value: unknown): string {
  const parts: string[] = []
  collectText(value, parts)
  return truncateText(parts.join(" ").replace(/\s+/g, " ").trim(), 220)
}

function collectText(value: unknown, parts: string[]) {
  if (value === null || value === undefined) return
  if (typeof value === "string") {
    const cleaned = value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").trim()
    if (cleaned) parts.push(cleaned)
    return
  }
  if (typeof value === "number" || typeof value === "boolean") {
    parts.push(String(value))
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, parts)
    return
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (SYSTEM_KEYS.has(key) || key === "blockType") continue
      collectText(nested, parts)
    }
  }
}

function truncateText(value: string, max: number) {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1).trimEnd()}…`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function deepEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function isStructurallyEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0
  return false
}

function humanizeKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase())
}
