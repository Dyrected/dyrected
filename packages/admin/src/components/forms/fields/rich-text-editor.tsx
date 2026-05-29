import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import LinkExtension from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { TableKit } from "@tiptap/extension-table"
import { Toggle } from "../../ui/toggle"
import { cn } from "../../../lib/utils"
import { MediaPicker } from "./media-picker"
import { Input } from "../../ui/input"
import { Button } from "../../ui/button"
import { Switch } from "../../ui/switch"
import { Label } from "../../ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Quote,
  Table as TableIcon,
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  collection?: string
}

const MenuBar = ({ editor, collection = "media" }: { editor: Editor | null, collection?: string }) => {
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState("")
  const [linkNewTab, setLinkNewTab] = React.useState(false)

  if (!editor) return null

  const openLinkDialog = () => {
    const attrs = editor.getAttributes("link")
    setLinkUrl(attrs.href || "")
    setLinkNewTab(attrs.target === "_blank")
    setLinkOpen(true)
  }

  const applyLink = () => {
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({
        href: linkUrl.trim(),
        target: linkNewTab ? "_blank" : undefined,
      }).run()
    }
    setLinkOpen(false)
  }

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
    setLinkOpen(false)
  }

  return (
    <div className="dy-border dy-border-input dy-rounded-t-md dy-p-1 dy-flex dy-flex-wrap dy-gap-1 dy-items-center dy-bg-muted/50">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="dy-h-4 dy-w-4" />
      </Toggle>

      <div className="dy-w-[1px] dy-h-6 dy-bg-border dy-mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="dy-h-4 dy-w-4" />
      </Toggle>

      <div className="dy-w-[1px] dy-h-6 dy-bg-border dy-mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="dy-h-4 dy-w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="dy-h-4 dy-w-4" />
      </Toggle>

      <div className="dy-w-[1px] dy-h-6 dy-bg-border dy-mx-1" />

      <Popover open={linkOpen} onOpenChange={setLinkOpen}>
        <PopoverTrigger asChild>
          <Toggle
            size="sm"
            pressed={editor.isActive("link")}
            onPressedChange={openLinkDialog}
          >
            <LinkIcon className="dy-h-4 dy-w-4" />
          </Toggle>
        </PopoverTrigger>
        <PopoverContent className="dy-w-72 dy-p-3" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="dy-space-y-3">
            <div>
              <label className="dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-1.5">
                URL
              </label>
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="dy-h-8 dy-text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyLink() } }}
                autoFocus
              />
            </div>
            <div className="dy-flex dy-items-center dy-gap-2">
              <Switch
                id="link-new-tab"
                checked={linkNewTab}
                onCheckedChange={setLinkNewTab}
                className="dy-scale-90"
              />
              <Label htmlFor="link-new-tab" className="dy-text-xs dy-font-normal dy-cursor-pointer">
                Open in new tab
              </Label>
            </div>
            <div className="dy-flex dy-gap-2">
              <Button size="sm" onClick={applyLink} className="dy-flex-1 dy-h-8 dy-text-xs">
                Apply
              </Button>
              {editor.isActive("link") && (
                <Button size="sm" variant="outline" onClick={removeLink} className="dy-h-8 dy-text-xs">
                  Remove
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="dy-w-[1px] dy-h-6 dy-bg-border dy-mx-1" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Toggle size="sm" pressed={editor.isActive("table")}>
            <TableIcon className="dy-h-4 dy-w-4" />
          </Toggle>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="dy-min-w-[180px]">
          <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
            Insert Table (3×3)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.isActive("table")}>
            Add Row Below
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.isActive("table")}>
            Add Row Above
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.isActive("table")}>
            Add Column Right
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.isActive("table")}>
            Add Column Left
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} disabled={!editor.isActive("table")} className="dy-text-destructive focus:dy-text-destructive">
            Delete Row
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.isActive("table")} className="dy-text-destructive focus:dy-text-destructive">
            Delete Column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.isActive("table")} className="dy-text-destructive focus:dy-text-destructive">
            Delete Table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="dy-ml-auto">
        <MediaPicker
          collection={collection}
          variant="icon"
          valueType="url"
          onChange={(val) => {
            const url = Array.isArray(val) ? val[0] : val
            if (url) {
              const filename = typeof url === 'string' ? url.split('/').pop() || 'image' : 'image'
              editor.chain().focus().setImage({ src: url, alt: filename }).run()
            }
          }}
        />
      </div>
    </div>
  )
}

export function RichTextEditor({ value, onChange, label, disabled, collection = "media" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Underline,
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full h-auto my-4",
        },
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
        },
      }),
      TableKit.configure({
        table: { HTMLAttributes: { class: "dy-border-collapse dy-w-full dy-my-4" } },
        tableCell: { HTMLAttributes: { class: "dy-border dy-border-border dy-p-2 dy-align-top dy-min-w-[100px]" } },
        tableHeader: { HTMLAttributes: { class: "dy-border dy-border-border dy-p-2 dy-bg-muted dy-font-semibold dy-text-left" } },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "dy-prose dy-prose-sm dark:dy-prose-invert dy-max-w-none dy-min-h-[150px] dy-p-4 focus:dy-outline-none dy-border dy-border-t-0 dy-rounded-b-md dy-border-input dy-bg-transparent",
      },
    },
  })

  React.useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [disabled, editor])

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const currentHtml = editor.getHTML()
      if (currentHtml !== value && value) {
        editor.commands.setContent(value)
      }
    }
  }, [value, editor])

  return (
    <div className="dy-space-y-2">
      {label && <label className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">{label}</label>}
      <div className="dy-flex dy-flex-col dy-w-full">
        {!disabled && <MenuBar editor={editor} collection={collection} />}
        <EditorContent editor={editor} className={cn(disabled && "dy-opacity-80 dy-prose prose lg:prose-xl lg:dy-prose-xl")} />
      </div>
    </div>
  )
}
