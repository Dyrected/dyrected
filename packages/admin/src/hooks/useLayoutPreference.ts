import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../providers/dyrected-context"

export interface LayoutItem {
  name: string
  width?: string
}

interface UseLayoutPreferenceOptions<T> {
  key: string
  defaultKeys: T[]
}

export function useLayoutPreference<T extends string | LayoutItem>({ key, defaultKeys }: UseLayoutPreferenceOptions<T>) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  // Fetch layout preference from API
  const { data, isLoading } = useQuery({
    queryKey: ["preferences", key],
    queryFn: async () => {
      if (!client) return null
      const res = await client.getPreference<unknown>(key)
      return res.value
    },
    enabled: !!client,
    staleTime: 5000,
    refetchOnWindowFocus: true,
  })

  // Validate and reconcile the stored layout with the live schema defaultKeys
  const reconciledLayout = useMemo(() => {
    const isStringArray = defaultKeys.every(k => typeof k === "string")

    if (!data || !Array.isArray(data)) {
      return defaultKeys
    }

    if (isStringArray) {
      // Reconcile simple string array
      const normalizedData = data.map(k => typeof k === "string" ? k : (k as any)?.name || "").filter(Boolean) as string[]
      const defaultStrings = defaultKeys as string[]
      const validKeys = normalizedData.filter(k => defaultStrings.includes(k))
      const missingKeys = defaultStrings.filter(k => !validKeys.includes(k))
      return [...validKeys, ...missingKeys] as T[]
    } else {
      // Reconcile LayoutItem array
      const normalizedData: LayoutItem[] = data.map((item): LayoutItem => {
        if (typeof item === "string") {
          return { name: item }
        }
        if (item && typeof item === "object" && "name" in item && typeof item.name === "string") {
          return { name: item.name, width: (item as any).width }
        }
        return { name: "" }
      }).filter(item => item.name !== "")

      const defaultItems = defaultKeys as LayoutItem[]
      const defaultNames = defaultItems.map(item => item.name)
      const defaultMap = new Map(defaultItems.map(item => [item.name, item]))

      const validItems = normalizedData.filter(item => defaultNames.includes(item.name))
      const validNames = validItems.map(item => item.name)
      const missingItems = defaultNames
        .filter(name => !validNames.includes(name))
        .map(name => defaultMap.get(name)!)

      // Also merge width updates from defaultKeys if they are defined there but not in preferences
      const mergedItems = validItems.map(item => {
        const def = defaultMap.get(item.name)
        return {
          ...item,
          width: item.width || def?.width
        }
      })

      return [...mergedItems, ...missingItems] as T[]
    }
  }, [data, defaultKeys])

  // Local state for optimistic updates during dragging
  const [localLayout, setLocalLayout] = useState<T[]>(reconciledLayout)

  // Sync local layout whenever reconciled layout updates from server/query cache
  const syncLayout = useState(() => {
    return (next: T[]) => {
      setLocalLayout((prev) => {
        const isEq = prev.length === next.length && prev.every((v, i) => {
          if (typeof v === "string") return v === next[i]
          return v.name === (next[i] as any).name && v.width === (next[i] as any).width
        })
        return isEq ? prev : next
      })
    }
  })[0]

  useEffect(() => {
    syncLayout(reconciledLayout)
  }, [reconciledLayout, syncLayout])

  // Save preference mutation
  const saveMutation = useMutation({
    mutationFn: async ({ scope, value }: { scope: 'personal' | 'global'; value: T[] }) => {
      if (!client) throw new Error("Client not available")
      const clientWithPrefs = client as unknown as {
        setPreference: (key: string, value: unknown, options?: { scope?: string }) => Promise<{ key: string; value: unknown }>
        deletePreference: (key: string, options?: { scope?: string }) => Promise<{ success: boolean }>
      }
      await clientWithPrefs.setPreference(key, value, { scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences", key] })
    },
  })

  // Reset preference mutation
  const resetMutation = useMutation({
    mutationFn: async ({ scope }: { scope: 'personal' | 'global' }) => {
      if (!client) throw new Error("Client not available")
      const clientWithPrefs = client as unknown as {
        setPreference: (key: string, value: unknown, options?: { scope?: string }) => Promise<{ key: string; value: unknown }>
        deletePreference: (key: string, options?: { scope?: string }) => Promise<{ success: boolean }>
      }
      await clientWithPrefs.deletePreference(key, { scope })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences", key] })
    },
  })

  return {
    layout: localLayout,
    setLayout: setLocalLayout,
    reconciledLayout,
    saveLayout: (scope: 'personal' | 'global') => saveMutation.mutateAsync({ scope, value: localLayout }),
    resetLayout: (scope: 'personal' | 'global') => resetMutation.mutateAsync({ scope }),
    isLoading,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
  }
}
