import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../providers/dyrected-context"
import { getAdminActionUrl } from "../lib/utils"

interface InviteResult {
  email: string
  inviteUrl: string
}

interface UseCollectionInviteOptions {
  collectionSlug: string
  inviteRoleField?: { fieldName: string; hasMany: boolean }
}

export function useCollectionInvite({ collectionSlug, inviteRoleField }: UseCollectionInviteOptions) {
  const { client } = useDyrected()

  return useMutation({
    mutationFn: async ({
      email,
      role,
    }: {
      email: string
      role?: string
    }): Promise<InviteResult> => {
      if (!client) throw new Error("Client not initialized")
      const inviteBaseUrl = getAdminActionUrl()

      const authCollectionClient = client.collection(collectionSlug) as {
        invite: (
          email: string,
          inviteUrlOrOptions?: string | { inviteUrl?: string; data?: Record<string, unknown> },
        ) => Promise<{ inviteUrl?: string; token?: string }>
      }

      const response = await authCollectionClient.invite(email, {
        inviteUrl: inviteBaseUrl,
        data:
          role && inviteRoleField
            ? {
                [inviteRoleField.fieldName]: inviteRoleField.hasMany ? [role] : role,
              }
            : undefined,
      })

      const inviteUrl =
        response.inviteUrl ??
        (response.token && inviteBaseUrl
          ? `${inviteBaseUrl}?inviteToken=${encodeURIComponent(response.token)}`
          : undefined)
      if (!inviteUrl) {
        throw new Error("Invite link could not be generated.")
      }

      return {
        email,
        inviteUrl,
      }
    },
    onSuccess: (result) => {
      toast.success("Invite sent", {
        description: `An invitation is ready for ${result.email}.`,
      })
    },
    onError: (error: Error) => {
      toast.error("Failed to send invite", {
        description: error.message,
      })
    },
  })
}
