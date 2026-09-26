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
import { getDefaultEmailTemplate } from '@dyrected/core';

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

function formatHtml(html: string): string {
  if (!html || typeof html !== "string") return ""

  const voidTags = new Set([
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr", "!doctype",
  ])

  let indent = 0
  const tab = "  "

  const rawLines = html
    .replace(/(>)(<)(\/*)/g, "$1\n$2$3")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const result: string[] = []

  for (const line of rawLines) {
    if (line.match(/^<\/[a-zA-Z0-9-]+/)) {
      indent = Math.max(0, indent - 1)
      result.push(tab.repeat(indent) + line)
    } else if (line.match(/^<([a-zA-Z0-9-]+)[^>]*>.*<\/\1>$/)) {
      result.push(tab.repeat(indent) + line)
    } else if (line.match(/^<(!|!--|\?)/)) {
      result.push(tab.repeat(indent) + line)
    } else if (line.match(/^<[a-zA-Z0-9-]+[^>]*\/>/)) {
      result.push(tab.repeat(indent) + line)
    } else if (line.match(/^<[a-zA-Z0-9-]+/)) {
      const tagMatch = line.match(/^<([a-zA-Z0-9-]+)/)
      const tag = tagMatch ? tagMatch[1].toLowerCase() : ""
      result.push(tab.repeat(indent) + line)
      if (!voidTags.has(tag)) {
        indent++
      }
    } else {
      result.push(tab.repeat(indent) + line)
    }
  }

  return result.join("\n")
}

export function EmailTemplateEditor({
  value,
  onChange,
  disabled = false,
  siblingData,
}: EmailTemplateEditorProps) {
  const { user, schemas, client } = useDyrected()
  const siteName = schemas?.admin?.branding?.logoText || "Dyrected"
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

  const defaultHtml = React.useMemo(() => {
    return getDefaultEmailTemplate(purpose || "invite", { siteName }).rawHtml
  }, [purpose, siteName])

  // Ensure default template if value is empty
  React.useEffect(() => {
    if (!value && format === "html") {
      onChange(defaultHtml)
    }
  }, [value, format, defaultHtml, onChange])

  const handleRevertToDefault = React.useCallback(() => {
    onChange(defaultHtml)
    toast.success("Reverted to code default template")
  }, [defaultHtml, onChange])

  const handleFormatHtml = React.useCallback(() => {
    if (!value) return
    const formatted = formatHtml(value)
    onChange(formatted)
    toast.success("HTML formatted")
  }, [value, onChange])

  const handleInsertTag = React.useCallback(
    (tag: string) => {
      onChange(value ? `${value}\n${tag}` : tag)
      toast.info(`Inserted ${tag}`)
    },
    [value, onChange],
  )

  const compiledPreviewHtml = React.useMemo(() => {
    if (!value) return ""
    const targetCol = schemas?.collections?.find((c) => c.slug === collectionSlug)
    const resolvedCollectionLabel =
      collectionSlug === "*"
        ? "Account"
        : targetCol?.labels?.singular ||
          targetCol?.labels?.plural ||
          (collectionSlug.startsWith("__")
            ? collectionSlug.slice(2).charAt(0).toUpperCase() + collectionSlug.slice(3)
            : collectionSlug.charAt(0).toUpperCase() + collectionSlug.slice(1))

    const mockData: Record<string, string> = {
      "{{url}}": "https://app.example.com/auth/setup-password?token=mock_jwt_token_sample_xyz",
      "{{token}}": "mock_jwt_token_sample_xyz",
      "{{email}}": "alex.johnson@example.com",
      "{{collectionLabel}}": resolvedCollectionLabel,
      "{{siteName}}": siteName,
      "{{user.name}}": "Alex Johnson",
      "{{user.first_name}}": "Alex",
      "{{user.email}}": "alex.johnson@example.com",
    }

    let rendered = value
    for (const [tag, sample] of Object.entries(mockData)) {
      rendered = rendered.split(tag).join(sample)
    }
    return rendered
  }, [value, collectionSlug, siteName, schemas?.collections])

  const handleSendTestEmail = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!testRecipient) return
      setIsSendingTest(true)
      try {
        const baseUrl = client?.getBaseUrl() || ""
        const authHeaders = client?.getAuthHeaders() || {}
        const subjectVal = (siblingData?.subject as string) || undefined

        const res = await fetch(`${baseUrl}/api/__email_templates/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
          },
          body: JSON.stringify({
            to: testRecipient,
            subject: subjectVal,
            html: value,
            format,
            externalTemplateId,
            purpose,
            collectionSlug,
          }),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data.message || `Failed to send test email (status: ${res.status})`)
        }

        if (data.previewUrl) {
          toast.success(`Test email sent!`, {
            description: `Preview: ${data.previewUrl}`,
            action: {
              label: "Open Preview",
              onClick: () => window.open(data.previewUrl, "_blank"),
            },
            duration: 10000,
          })
        } else {
          toast.success(`Test email dispatched to ${testRecipient}`)
        }
        setIsTestEmailOpen(false)
      } catch (err: any) {
        toast.error(`Failed to send test email: ${err.message}`)
      } finally {
        setIsSendingTest(false)
      }
    },
    [testRecipient, client, siblingData, value, format, externalTemplateId, purpose, collectionSlug],
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
          <Button
            type="button"
            size="sm"
            variant={viewMode === "split" ? "secondary" : "ghost"}
            onClick={() => setViewMode("split")}
            className="dy-h-8 dy-text-xs dy-hidden md:dy-flex"
          >
            <Columns2 className="dy-mr-1.5 dy-h-3.5 dy-w-3.5" />
            Split View
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
      <div
        className={
          viewMode === "split"
            ? "dy-grid dy-gap-3 lg:dy-grid-cols-2"
            : "dy-w-full"
        }
      >
        {/* Editor Pane */}
        {viewMode !== "preview" && (
          <div className="dy-relative dy-h-[520px] dy-rounded-lg dy-border dy-border-border dy-overflow-hidden dy-bg-background dy-flex dy-flex-col">
            <div className="dy-absolute dy-top-2.5 dy-right-3 dy-z-10">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleFormatHtml}
                disabled={disabled || !value}
                className="dy-h-6 dy-px-2 dy-text-[11px] dy-font-medium dy-shadow-sm dy-bg-background/90 dy-backdrop-blur dy-border dy-border-border/70 hover:dy-bg-accent dy-text-muted-foreground hover:dy-text-foreground dy-gap-1"
                title="Format HTML indentation"
              >
                <Sparkles className="dy-h-3 dy-w-3" />
                Format HTML
              </Button>
            </div>
            <CodeMirror
              value={value || ""}
              height="520px"
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
              className="dy-text-xs dy-font-mono dy-h-full"
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {viewMode !== "editor" && (
          <div className="dy-h-[520px] dy-rounded-lg dy-border dy-border-border dy-overflow-hidden dy-bg-white dy-flex dy-flex-col">
            {previewDevice === "mobile" ? (
              <div className="dy-flex-1 dy-flex dy-items-center dy-justify-center dy-p-3 dy-bg-muted/10 dy-overflow-auto">
                <div className="dy-w-[375px] dy-h-[480px] dy-rounded-xl dy-border dy-border-border dy-shadow-md dy-overflow-hidden dy-bg-white">
                  <iframe
                    title="Email Template Preview"
                    srcDoc={compiledPreviewHtml}
                    sandbox="allow-same-origin"
                    className="dy-w-full dy-h-full dy-border-none"
                  />
                </div>
              </div>
            ) : (
              <iframe
                title="Email Template Preview"
                srcDoc={compiledPreviewHtml}
                sandbox="allow-same-origin"
                className="dy-w-full dy-h-full dy-border-none dy-flex-1"
              />
            )}
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
