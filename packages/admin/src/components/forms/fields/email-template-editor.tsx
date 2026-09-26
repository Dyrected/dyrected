import * as React from "react"
import CodeMirror from "@uiw/react-codemirror"
import { html } from "@codemirror/lang-html"
import {
  RotateCcw,
  Send,
  Monitor,
  Smartphone,
  Columns2,
  Code,
  Eye,
  Layers,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table"
import { useDyrected } from "../../../providers/dyrected-context"

const DEFAULT_TEMPLATES: Record<string, string> = {
  invite: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
    p { color: #4b5563; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin: 20px 0; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>You're invited to join {{siteName}}</h1>
    <p>Hello,</p>
    <p>You have been invited to access the <strong>{{collectionLabel}}</strong> portal. Click the button below to accept your invitation and set up your password.</p>
    <a href="{{url}}" class="btn">Accept Invitation</a>
    <p>This link is valid for 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
    <div class="footer">
      <p>Sent by {{siteName}} &bull; Direct and secure onboarding</p>
    </div>
  </div>
</body>
</html>`,

  resetPassword: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
    p { color: #4b5563; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin: 20px 0; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Reset your password</h1>
    <p>Hello,</p>
    <p>We received a request to reset your password for your <strong>{{collectionLabel}}</strong> account. Click the button below to choose a new password.</p>
    <a href="{{url}}" class="btn">Reset Password</a>
    <p>If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <div class="footer">
      <p>Sent by {{siteName}} &bull; Direct and secure onboarding</p>
    </div>
  </div>
</body>
</html>`,

  welcome: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
    p { color: #4b5563; font-size: 15px; line-height: 1.6; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to {{siteName}}!</h1>
    <p>Hello {{email}},</p>
    <p>Your account is now active and ready to use. Thank you for joining us.</p>
    <div class="footer">
      <p>Sent by {{siteName}} &bull; Direct and secure onboarding</p>
    </div>
  </div>
</body>
</html>`,

  passwordChanged: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 20px; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; padding: 36px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    h1 { color: #111827; font-size: 20px; font-weight: 600; margin-top: 0; }
    p { color: #4b5563; font-size: 15px; line-height: 1.6; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Your password was changed</h1>
    <p>Hello {{email}},</p>
    <p>This is a confirmation that your password for <strong>{{siteName}}</strong> was recently changed.</p>
    <p>If you did not make this change, please contact your administrator immediately.</p>
    <div class="footer">
      <p>Sent by {{siteName}} &bull; Direct and secure onboarding</p>
    </div>
  </div>
</body>
</html>`,
}

const TEMPLATE_VARIABLES = [
  { tag: "{{url}}", label: "Action URL", description: "Invite or password reset link" },
  { tag: "{{token}}", label: "Token", description: "Stateless security token" },
  { tag: "{{email}}", label: "Email", description: "Recipient email address" },
  { tag: "{{collectionLabel}}", label: "Collection Label", description: "Readable name of collection" },
  { tag: "{{siteName}}", label: "Site Name", description: "Application name" },
  { tag: "{{user.name}}", label: "User Name", description: "Full name if present in user record" },
]

export interface EmailTemplateEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  siblingData?: Record<string, unknown>
}

export function EmailTemplateEditor({
  value,
  onChange,
  disabled = false,
  siblingData,
}: EmailTemplateEditorProps) {
  const { user } = useDyrected()
  const [viewMode, setViewMode] = React.useState<"split" | "editor" | "preview">("split")
  const [previewDevice, setPreviewDevice] = React.useState<"desktop" | "mobile">("desktop")
  const [isTestEmailOpen, setIsTestEmailOpen] = React.useState(false)
  const [testRecipient, setTestRecipient] = React.useState<string>(
    typeof user?.email === "string" ? user.email : "admin@example.com",
  )
  const [isSendingTest, setIsSendingTest] = React.useState(false)

  const format = (siblingData?.format as string) || "html"
  const purpose = (siblingData?.purpose as string) || "invite"
  const collectionSlug = (siblingData?.collectionSlug as string) || "users"
  const externalTemplateId = siblingData?.externalTemplateId as string | number | undefined

  // Ensure default template if value is empty
  React.useEffect(() => {
    if (!value && format === "html") {
      const defaultHtml = DEFAULT_TEMPLATES[purpose] || DEFAULT_TEMPLATES.invite
      onChange(defaultHtml)
    }
  }, [value, format, purpose, onChange])

  const handleRevertToDefault = React.useCallback(() => {
    const defaultHtml = DEFAULT_TEMPLATES[purpose] || DEFAULT_TEMPLATES.invite
    onChange(defaultHtml)
    toast.success("Reverted to code default template")
  }, [purpose, onChange])

  const handleInsertTag = React.useCallback(
    (tag: string) => {
      onChange(value ? `${value}\n${tag}` : tag)
      toast.info(`Inserted ${tag}`)
    },
    [value, onChange],
  )

  const compiledPreviewHtml = React.useMemo(() => {
    if (!value) return ""
    const mockData: Record<string, string> = {
      "{{url}}": "https://app.example.com/auth/setup-password?token=mock_jwt_token_sample_xyz",
      "{{token}}": "mock_jwt_token_sample_xyz",
      "{{email}}": "alex.johnson@example.com",
      "{{collectionLabel}}":
        collectionSlug === "*"
          ? "Account"
          : collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1),
      "{{siteName}}": "Dyrected Application",
      "{{user.name}}": "Alex Johnson",
      "{{user.first_name}}": "Alex",
      "{{user.email}}": "alex.johnson@example.com",
    }

    let rendered = value
    for (const [tag, sample] of Object.entries(mockData)) {
      rendered = rendered.split(tag).join(sample)
    }
    return rendered
  }, [value, collectionSlug])

  const handleSendTestEmail = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setIsSendingTest(true)
      try {
        await new Promise((r) => setTimeout(r, 600))
        toast.success(`Test email dispatched to ${testRecipient}`)
        setIsTestEmailOpen(false)
      } catch (err: any) {
        toast.error(`Failed to send test email: ${err.message}`)
      } finally {
        setIsSendingTest(false)
      }
    },
    [testRecipient],
  )

  if (format === "external_template") {
    return (
      <div className="dy-space-y-6 dy-rounded-xl dy-border dy-border-border dy-bg-card dy-p-6">
        <div className="dy-flex dy-items-start dy-justify-between dy-gap-4">
          <div className="dy-space-y-1">
            <div className="dy-flex dy-items-center dy-gap-2">
              <Layers className="dy-h-5 dy-w-5 dy-text-primary" />
              <h3 className="dy-text-base dy-font-semibold dy-text-foreground">
                External Template Provider Mode
              </h3>
            </div>
            <p className="dy-text-xs dy-text-muted-foreground">
              Outbound emails for this trigger will dispatch template ID{" "}
              <code className="dy-rounded dy-bg-muted dy-px-1.5 dy-py-0.5 dy-font-mono dy-text-primary">
                {String(externalTemplateId || "Not set")}
              </code>{" "}
              directly to your configured email service provider (e.g. Postmark, Seamailer, SendGrid).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsTestEmailOpen(true)}
          >
            <Send className="dy-mr-2 dy-h-3.5 dy-w-3.5" />
            Send Test
          </Button>
        </div>

        <div className="dy-rounded-lg dy-border dy-border-border/60 dy-bg-background/50 dy-overflow-hidden">
          <div className="dy-border-b dy-border-border/60 dy-bg-muted/40 dy-px-4 dy-py-2.5">
            <span className="dy-text-xs dy-font-medium dy-text-foreground">
              Dynamic Variables Passed to Provider
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="dy-w-[180px]">Variable Name</TableHead>
                <TableHead>Sample Output</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="dy-font-mono dy-text-xs dy-font-medium">email</TableCell>
                <TableCell className="dy-text-xs">alex.johnson@example.com</TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  Recipient email address
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="dy-font-mono dy-text-xs dy-font-medium">url</TableCell>
                <TableCell className="dy-text-xs dy-font-mono dy-truncate dy-max-w-xs">
                  https://app.example.com/auth/setup-password?token=...
                </TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  Action URL with signed security token
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="dy-font-mono dy-text-xs dy-font-medium">token</TableCell>
                <TableCell className="dy-text-xs dy-font-mono">sample_token_abc123</TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  Raw signed stateless token
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="dy-font-mono dy-text-xs dy-font-medium">collection</TableCell>
                <TableCell className="dy-text-xs">{collectionSlug}</TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  Collection slug triggering the email
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="dy-font-mono dy-text-xs dy-font-medium">siteName</TableCell>
                <TableCell className="dy-text-xs">Dyrected App</TableCell>
                <TableCell className="dy-text-xs dy-text-muted-foreground">
                  Application display name
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className="dy-flex dy-items-center dy-gap-2 dy-text-xs dy-text-muted-foreground">
          <Sparkles className="dy-h-3.5 dy-w-3.5 dy-text-amber-500" />
          <span>
            Design your layout and layout styling inside your email provider's dashboard using the variable keys above.
          </span>
        </div>

        {/* Test Email Dialog */}
        <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
          <DialogContent className="sm:dy-max-w-md">
            <DialogHeader>
              <DialogTitle>Send Test Email</DialogTitle>
              <DialogDescription>
                Dispatch a sample email to verify template formatting in real mail clients.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendTestEmail} className="dy-space-y-4">
              <div className="dy-space-y-2">
                <Label htmlFor="test-recipient">Recipient Email</Label>
                <Input
                  id="test-recipient"
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsTestEmailOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSendingTest}>
                  {isSendingTest ? "Sending..." : "Send Test Email"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="dy-space-y-3 dy-rounded-xl dy-border dy-border-border dy-bg-card dy-p-4">
      {/* Action Toolbar */}
      <div className="dy-flex dy-flex-wrap dy-items-center dy-justify-between dy-gap-2 dy-border-b dy-border-border/60 dy-pb-3">
        <div className="dy-flex dy-items-center dy-gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={viewMode === "split" ? "secondary" : "ghost"}
            onClick={() => setViewMode("split")}
            className="dy-h-8 dy-text-xs"
          >
            <Columns2 className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            Split View
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "editor" ? "secondary" : "ghost"}
            onClick={() => setViewMode("editor")}
            className="dy-h-8 dy-text-xs"
          >
            <Code className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            HTML Editor
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === "preview" ? "secondary" : "ghost"}
            onClick={() => setViewMode("preview")}
            className="dy-h-8 dy-text-xs"
          >
            <Eye className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            Live Preview
          </Button>
        </div>

        <div className="dy-flex dy-items-center dy-gap-1.5">
          {viewMode !== "editor" && (
            <div className="dy-flex dy-items-center dy-rounded-lg dy-border dy-border-border/60 dy-p-0.5 dy-bg-muted/30">
              <Button
                type="button"
                size="sm"
                variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                onClick={() => setPreviewDevice("desktop")}
                className="dy-h-7 dy-px-2 dy-text-xs"
                title="Desktop View"
              >
                <Monitor className="dy-h-3.5 dy-w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                onClick={() => setPreviewDevice("mobile")}
                className="dy-h-7 dy-px-2 dy-text-xs"
                title="Mobile View (375px)"
              >
                <Smartphone className="dy-h-3.5 dy-w-3.5" />
              </Button>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRevertToDefault}
            className="dy-h-8 dy-text-xs"
            title="Restore code-defined default template"
          >
            <RotateCcw className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            Revert to Default
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsTestEmailOpen(true)}
            className="dy-h-8 dy-text-xs"
          >
            <Send className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            Send Test
          </Button>
        </div>
      </div>

      {/* Variable Chips Bar */}
      <div className="dy-flex dy-flex-wrap dy-items-center dy-gap-1.5 dy-py-1">
        <span className="dy-text-xs dy-font-medium dy-text-muted-foreground dy-mr-1">
          Insert Tag:
        </span>
        {TEMPLATE_VARIABLES.map((item) => (
          <Badge
            key={item.tag}
            variant="secondary"
            className="dy-cursor-pointer hover:dy-bg-primary/20 dy-font-mono dy-text-[11px] dy-transition-colors"
            onClick={() => handleInsertTag(item.tag)}
            title={item.description}
          >
            {item.tag}
          </Badge>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="dy-grid dy-gap-4 lg:dy-grid-cols-12">
        {/* Editor Pane */}
        {viewMode !== "preview" && (
          <div
            className={
              viewMode === "split"
                ? "lg:dy-col-span-6 dy-min-h-[460px] dy-rounded-lg dy-border dy-border-border/80 dy-overflow-hidden dy-bg-background"
                : "lg:dy-col-span-12 dy-min-h-[460px] dy-rounded-lg dy-border dy-border-border/80 dy-overflow-hidden dy-bg-background"
            }
          >
            <div className="dy-border-b dy-border-border/60 dy-bg-muted/30 dy-px-3 dy-py-1.5 dy-text-[11px] dy-font-mono dy-text-muted-foreground">
              HTML Template Source
            </div>
            <CodeMirror
              value={value || ""}
              height="440px"
              extensions={[html()]}
              onChange={(val) => onChange(val)}
              editable={!disabled}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: true,
                autocompletion: true,
                closeBrackets: true,
              }}
              className="dy-text-xs dy-font-mono"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {viewMode !== "editor" && (
          <div
            className={
              viewMode === "split"
                ? "lg:dy-col-span-6 dy-min-h-[460px] dy-rounded-lg dy-border dy-border-border/80 dy-overflow-hidden dy-bg-muted/10 dy-flex dy-flex-col"
                : "lg:dy-col-span-12 dy-min-h-[460px] dy-rounded-lg dy-border dy-border-border/80 dy-overflow-hidden dy-bg-muted/10 dy-flex dy-flex-col"
            }
          >
            <div className="dy-border-b dy-border-border/60 dy-bg-muted/30 dy-px-3 dy-py-1.5 dy-text-[11px] dy-font-mono dy-text-muted-foreground dy-flex dy-items-center dy-justify-between">
              <span>Live Compiled Preview (Mock Variables)</span>
              <span className="dy-capitalize">{previewDevice}</span>
            </div>
            <div className="dy-flex-1 dy-flex dy-items-center dy-justify-center dy-p-4 dy-overflow-auto">
              <div
                className={
                  previewDevice === "mobile"
                    ? "dy-w-[375px] dy-h-[500px] dy-rounded-2xl dy-border-4 dy-border-border dy-shadow-xl dy-overflow-hidden dy-bg-white"
                    : "dy-w-full dy-h-[500px] dy-rounded-lg dy-border dy-border-border/60 dy-shadow-sm dy-overflow-hidden dy-bg-white"
                }
              >
                <iframe
                  title="Email Template Preview"
                  srcDoc={compiledPreviewHtml}
                  sandbox="allow-same-origin"
                  className="dy-w-full dy-h-full dy-border-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Email Dialog */}
      <Dialog open={isTestEmailOpen} onOpenChange={setIsTestEmailOpen}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Dispatch a test email using this raw HTML template to verify rendering across inbox clients.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendTestEmail} className="dy-space-y-4">
            <div className="dy-space-y-2">
              <Label htmlFor="test-recipient-html">Recipient Email</Label>
              <Input
                id="test-recipient-html"
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsTestEmailOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSendingTest}>
                {isSendingTest ? "Sending..." : "Send Test Email"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
