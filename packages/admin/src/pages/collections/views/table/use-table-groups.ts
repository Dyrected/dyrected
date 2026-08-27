import * as React from "react"
import { keepPreviousData, queryOptions, useQueries, useQuery } from "@tanstack/react-query"

import { useDyrected } from "../../../../providers/dyrected-context"
import { resolveViewFilter, resolveViewSort } from "../resolve-view-filter"
import type { SerializedView } from "../types"

export const UNASSIGNED_GROUP = "__unassigned__"
const PAGE_SIZE = 100
const MAX_GROUPS = 25

export interface TableGroupState {
  value: string
  label: string
  docs: Record<string, any>[]
  total: number
  hasNextPage: boolean
  isPending: boolean
  isError: boolean
  isFetching: boolean
  refetch: () => void
}

/** Determines which fields in the schema can be used to group the table. */
export function getGroupableFields(schema: any): Array<{ name: string; label: string; type: string }> {
  const fields = (schema?.fields ?? []) as Array<any>
  return fields
    .filter((field) => {
      if (!field?.name) return false
      // Exclude join fields (virtual)
      if (field.type === "join") return false
      // Eligible grouping types: select, radio, boolean, relationship, number, text
      return ["select", "radio", "boolean", "relationship", "number", "text"].includes(field.type)
    })
    .map((field) => ({
      name: field.name,
      label: field.label || field.name,
      type: field.type,
    }))
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`
}

function unassignedWhere(groupField: string, fieldType?: string): Record<string, any> {
  const conditions: Record<string, any>[] = [
    { [groupField]: null },
    { [groupField]: { exists: false } },
  ]
  if (!fieldType || fieldType === "text" || fieldType === "select" || fieldType === "textarea") {
    conditions.push({ [groupField]: "" })
  }
  return {
    OR: conditions,
  }
}

function groupWhere(base: Record<string, any> | undefined, condition: Record<string, any>): Record<string, any> {
  return base ? { AND: [base, condition] } : condition
}

export function coerceTableGroupValue(value: string, groupField: string, schema: any): unknown {
  const field = (schema?.fields ?? []).find((candidate: any) => candidate.name === groupField)
  if (field?.type === "boolean") return value === "true"
  if (field?.type === "number") {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

export interface UseTableGroupsOptions {
  slug: string
  view: SerializedView
  schema: any
  groupField?: string
  filter?: Record<string, any> | string
  sort?: string
}

export function useTableGroups({
  slug,
  view,
  schema,
  groupField,
  filter,
  sort,
}: UseTableGroupsOptions) {
  const { client } = useDyrected()
  const filterHash = React.useMemo(() => stableStringify(filter ?? view.filter ?? null), [filter, view.filter])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const base = React.useMemo(() => resolveViewFilter(filter ?? view.filter), [filterHash])
  const sortString = sort || (view.sort ? resolveViewSort(view.sort) : undefined)

  const fieldDef = React.useMemo(
    () => (schema?.fields ?? []).find((f: any) => f.name === groupField),
    [schema, groupField],
  )

  // For relationship fields, fetch related records to populate group options
  const relationTo = fieldDef?.type === "relationship" ? fieldDef.relationTo : undefined

  const { data: relationDocs = [] } = useQuery({
    queryKey: ["table-group-relations", relationTo],
    queryFn: async () => {
      if (!client || !relationTo) return []
      const result = await (client as any).collection(relationTo).find({ limit: 100 })
      return (result?.docs ?? []) as Record<string, any>[]
    },
    enabled: Boolean(client && relationTo),
    staleTime: 60_000,
  })

  const hasPredefinedOptions = Array.isArray(fieldDef?.options) && fieldDef.options.length > 0

  // For scalar fields (number, text) without predefined options, derive distinct values using SQL aggregate
  const { data: distinctValues = [] } = useQuery({
    queryKey: ["table-group-distinct", slug, groupField, filterHash],
    queryFn: async () => {
      if (!client || !groupField) return []
      try {
        const aggRes = await (client as any).collection(slug).aggregate({
          distinctValues: { distinct: groupField, where: base },
        })
        if (aggRes && Array.isArray(aggRes.distinctValues)) {
          const raw = aggRes.distinctValues as any[]
          const values = raw.filter((v) => v !== undefined && v !== null && v !== "")
          return values.map(String).sort((a: string, b: string) => {
            const numA = Number(a)
            const numB = Number(b)
            if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB
            return a.localeCompare(b)
          })
        }
      } catch {
        // Fallback to find if aggregate not available
      }
      const res = await (client as any).collection(slug).find({
        where: base,
        limit: 100,
      })
      const rawDocs = (res?.docs ?? []) as Record<string, any>[]
      const values = new Set<string>()
      for (const d of rawDocs) {
        const val = d[groupField]
        if (val !== undefined && val !== null && val !== "") {
          values.add(String(val))
        }
      }
      return Array.from(values).sort((a, b) => {
        const numA = Number(a)
        const numB = Number(b)
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB
        return a.localeCompare(b)
      })
    },
    enabled: Boolean(
      client &&
        groupField &&
        fieldDef &&
        fieldDef.type !== "boolean" &&
        fieldDef.type !== "relationship" &&
        !hasPredefinedOptions,
    ),
    staleTime: 30_000,
  })

  const groups = React.useMemo(() => {
    if (!groupField || !fieldDef) return []

    if (fieldDef.type === "boolean") {
      return [
        { value: "true", label: fieldDef.label ? `${fieldDef.label}: Yes` : "Yes" },
        { value: "false", label: fieldDef.label ? `${fieldDef.label}: No` : "No" },
      ]
    }

    if (fieldDef.type === "relationship" && relationTo) {
      return relationDocs.map((doc) => ({
        value: String(doc.id),
        label: String(doc.title || doc.name || doc.label || doc.slug || doc.id),
      }))
    }

    if (hasPredefinedOptions) {
      const options = fieldDef.options as any[]
      return options.map((option: any) =>
        typeof option === "string"
          ? { value: option, label: option }
          : { value: String(option.value), label: String(option.label ?? option.value) },
      )
    }

    return distinctValues.map((val) => ({
      value: val,
      label: fieldDef.type === "number" ? `${fieldDef.label || fieldDef.name}: ${val}` : val,
    }))
  }, [groupField, fieldDef, relationTo, relationDocs, hasPredefinedOptions, distinctValues])

  const enabled = Boolean(client && groupField && groups.length <= MAX_GROUPS)

  const fetchGroup = React.useCallback(
    async (value: string): Promise<{ docs: Record<string, any>[]; total: number; hasNextPage: boolean }> => {
      if (!client || !groupField) throw new Error("Dyrected client unavailable")
      const condition =
        value === UNASSIGNED_GROUP
          ? unassignedWhere(groupField, fieldDef?.type)
          : { [groupField]: coerceTableGroupValue(value, groupField, schema) }
      const where = groupWhere(base, condition)
      const result = await (client as any).collection(slug).find({
        where,
        sort: sortString,
        limit: PAGE_SIZE,
      })
      return {
        docs: (result?.docs ?? []) as Record<string, any>[],
        total: Number(result?.total ?? result?.docs?.length ?? 0),
        hasNextPage: Boolean(result?.hasNextPage),
      }
    },
    [client, slug, groupField, fieldDef?.type, schema, base, sortString],
  )

  const queries = React.useMemo(() => {
    if (!enabled) return []
    const groupValues = [...groups.map((g) => g.value), UNASSIGNED_GROUP]
    return groupValues.map((value) =>
      queryOptions({
        queryKey: ["table-group", slug, view.slug, groupField, value, filterHash, sortString ?? null] as const,
        queryFn: () => fetchGroup(value),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 15_000,
      }),
    )
  }, [groups, slug, view.slug, groupField, filterHash, sortString, fetchGroup, enabled])

  const grouped = useQueries({
    queries: queries as any,
  })

  const groupStates: TableGroupState[] = React.useMemo(() => {
    if (!enabled) return []
    const unassignedIdx = groups.length
    const unassignedQuery = grouped[unassignedIdx] as any
    const unassignedData = unassignedQuery?.data

    const unassignedState: TableGroupState = {
      value: UNASSIGNED_GROUP,
      label: "Unassigned",
      docs: unassignedData?.docs ?? [],
      total: Number(unassignedData?.total ?? unassignedData?.docs?.length ?? 0),
      hasNextPage: Boolean(unassignedData?.hasNextPage),
      isPending: Boolean(unassignedQuery?.isPending),
      isError: Boolean(unassignedQuery?.isError),
      isFetching: Boolean(unassignedQuery?.isFetching),
      refetch: () => void unassignedQuery?.refetch?.(),
    }

    const regularStates: TableGroupState[] = groups.map((g, i) => {
      const q = grouped[i] as any
      const d = q?.data
      return {
        value: g.value,
        label: g.label,
        docs: d?.docs ?? [],
        total: Number(d?.total ?? d?.docs?.length ?? 0),
        hasNextPage: Boolean(d?.hasNextPage),
        isPending: Boolean(q?.isPending),
        isError: Boolean(q?.isError),
        isFetching: Boolean(q?.isFetching),
        refetch: () => void q?.refetch?.(),
      }
    })

    const hasUnassigned =
      unassignedState.docs.length > 0 || unassignedState.total > 0 || unassignedState.isPending

    return [...regularStates, ...(hasUnassigned ? [unassignedState] : [])]
  }, [groups, grouped, enabled])

  const isPending = groupStates.some((g) => g.isPending)
  const isFetching = groupStates.some((g) => g.isFetching)

  return {
    isGrouped: Boolean(groupField && enabled && (groups.length > 0 || groupStates.some((g) => g.docs.length > 0))),
    groupStates,
    isPending,
    isFetching,
    refetchAll: () => {
      for (const q of grouped) void (q as any)?.refetch?.()
    },
  }
}
