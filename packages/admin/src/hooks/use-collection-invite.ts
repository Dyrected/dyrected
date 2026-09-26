import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useDyrected } from "../providers/dyrected-context"
import { getAdminActionUrl } from "../lib/utils"

export interface InviteResult {
  email: string
  inviteUrl: string
  emailSent?: boolean
  token?: string
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
        ) => Promise<{ inviteUrl?: string; token?: string; emailSent?: boolean }>
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
        emailSent: response.emailSent,
        token: response.token,
      }
    },
    onSuccess: (result) => {
      if (result.emailSent === false) {
        toast.warning("Invite link generated", {
          description: `Email delivery was skipped for ${result.email}. Share the link manually.`,
        })
      } else {
        toast.success("Invite sent", {
          description: `An invitation has been sent to ${result.email}.`,
        })
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to send invite", {
        description: error.message,
      })
    },
  })
}

