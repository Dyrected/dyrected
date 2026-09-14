import * as React from "react"
import { MailPlus, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { useCollectionInvite } from "../../hooks/use-collection-invite"

interface InviteDialogProps {
  collectionSlug: string
  collectionLabel: string
  inviteRoleField?: { fieldName: string; hasMany: boolean; options: { label: string; value: string }[] }
  inviteUrl: string
  defaultRole?: string
}

export function InviteDialog({
  collectionSlug,
  collectionLabel,
  inviteRoleField,
  inviteUrl,
  defaultRole,
}: InviteDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState(defaultRole || "")
  const [result, setResult] = React.useState<{ email: string; inviteUrl: string } | null>(null)

  const inviteMutation = useCollectionInvite({
    collectionSlug,
    inviteRoleField: inviteRoleField
      ? { fieldName: inviteRoleField.fieldName, hasMany: inviteRoleField.hasMany }
      : undefined,
  })

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setEmail("")
      setRole(defaultRole || "")
      setResult(null)
      inviteMutation.reset()
    }
  }, [defaultRole, inviteMutation])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      await inviteMutation.mutateAsync({
        email,
        role: role || undefined,
        inviteUrl,
      })
      setResult({
        email,
        inviteUrl: inviteUrl, // Will be replaced by actual URL from mutation
      })
    },
    [email, role, inviteUrl, inviteMutation],
  )

  const handleCopyInviteLink = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result.inviteUrl)
    toast.success("Invite link copied")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <MailPlus className="dy-mr-2 dy-h-4 dy-w-4" />
          Invite {collectionLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:dy-max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite {collectionLabel}</DialogTitle>
          <DialogDescription>
            Send an invite email and keep a shareable link handy for direct onboarding.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="dy-space-y-4">
          <div className="dy-space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </div>

          {inviteRoleField && inviteRoleField.options.length > 0 ? (
            <div className="dy-space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="invite-role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {inviteRoleField.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {result ? (
            <div className="dy-space-y-3 dy-rounded-2xl dy-border dy-border-emerald-500/20 dy-bg-emerald-500/5 dy-p-4">
              <div className="dy-flex dy-items-start dy-gap-3">
                <div className="dy-flex dy-h-9 dy-w-9 dy-items-center dy-justify-center dy-rounded-full dy-bg-emerald-500/10 dy-text-emerald-600">
                  <CheckCircle2 className="dy-h-4.5 dy-w-4.5" />
                </div>
                <div className="dy-min-w-0 dy-flex-1">
                  <p className="dy-text-sm dy-font-semibold dy-text-foreground">
                    Invite ready for {result.email}
                  </p>
                  <p className="dy-text-xs dy-text-muted-foreground">
                    The email has been sent. You can also copy the invite link below and share it manually.
                  </p>
                </div>
              </div>

              <div className="dy-space-y-2">
                <Label htmlFor="invite-link">Invite link</Label>
                <div className="dy-flex dy-gap-2">
                  <Input
                    id="invite-link"
                    value={result.inviteUrl}
                    readOnly
                    className="dy-font-mono dy-text-xs"
                  />
                  <Button type="button" variant="outline" onClick={() => void handleCopyInviteLink()}>
                    <Copy className="dy-mr-2 dy-h-3.5 dy-w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
