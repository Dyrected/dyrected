import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useDyrected } from "../providers/dyrected-context"

/**
 * usePreference — read/write a single scalar user preference.
 *
 * `useLayoutPreference` is hard-typed around arrays (it reconciles ordered
 * field lists). This hook is the scalar counterpart: it calls the same
 * `client.getPreference` / `client.setPreference` SDK methods directly and
 * unwraps the `{ key, value }` envelope the SDK returns.
 */
export function usePreference<T>(key: string, defaultValue: T) {
  const { client } = useDyrected()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<T>({
    queryKey: ["preference", key],
    queryFn: async () => {
      const res = await client!.getPreference<T>(key)
      return (res.value as T) ?? defaultValue
    },
    enabled: !!client,
    staleTime: 5_000,
  })

  const mutation = useMutation({
    mutationFn: async (value: T) => {
      if (!client) throw new Error("Client not available")
      return client.setPreference(key, value, { scope: "personal" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preference", key] })
    },
  })

  const value = data ?? defaultValue
  const setValue = (next: T) => mutation.mutate(next)

  return { value, setValue, isLoading }
}
