import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { TableKit } from "@tiptap/extension-table"
import type { HeadingLevel, RichTextFeature } from "@dyrected/core"
import { Toggle } from "../../ui/toggle"
import { cn } from "../../../lib/utils"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../ui/dialog"
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
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Quote,
  Table as TableIcon,
} from "lucide-react"

const DEFAULT_HEADING_LEVELS: HeadingLevel[] = [1, 2, 3]

const MediaPicker = React.lazy(async () => {
  const module = await import("./media-picker")
  return { default: module.MediaPicker }
})

const HEADING_ICONS: Record<HeadingLevel, React.ComponentType<{ className?: string }>> = {
  1: Heading1,
  2: Heading2,
  3: Heading3,
  4: Heading4,
  5: Heading5,
  6: Heading6,
}

/** True when `feature` is enabled. An undefined feature list means every feature is on. */
function hasFeature(features: RichTextFeature[] | undefined, feature: RichTextFeature): boolean {
  return !features || features.includes(feature)
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  collection?: string
  /** Enabled editor capabilities. When omitted, every feature is enabled. */
  features?: RichTextFeature[]
  /** Heading levels offered by the `heading` feature. Defaults to `[1, 2, 3]`. */
  headingLevels?: HeadingLevel[]
}

interface MenuBarProps {
  editor: Editor | null
  collection?: string
  features?: RichTextFeature[]
  headingLevels: HeadingLevel[]
}

const Separator = () => <div className="dy-w-[1px] dy-h-6 dy-bg-border dy-mx-1" />

const MenuBar = ({ editor, collection = "media", features, headingLevels }: MenuBarProps) => {
  const [linkOpen, setLinkOpen] = React.useState(false)
  const [linkUrl, setLinkUrl] = React.useState("")
  const [linkNewTab, setLinkNewTab] = React.useState(false)

  if (!editor) return null

  const has = (feature: RichTextFeature) => hasFeature(features, feature)

  const inlineGroup = has("bold") || has("italic") || has("underline") || has("strike")
  const blockGroup = has("heading") || has("bulletList") || has("orderedList") || has("blockquote")
  const alignGroup = has("align")
  const linkGroup = has("link")
  const tableGroup = has("table")

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
      {inlineGroup && (
        <>
          {has("bold") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("bold")}
              onPressedChange={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
          {has("italic") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("italic")}
              onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
          {has("underline") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("underline")}
              onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
          {has("strike") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("strike")}
              onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            >
              <Strikethrough className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
        </>
      )}

      {inlineGroup && blockGroup && <Separator />}

      {blockGroup && (
        <>
          {has("heading") &&
            headingLevels.map((level) => {
              const Icon = HEADING_ICONS[level]
              return (
                <Toggle
                  key={level}
                  size="sm"
                  pressed={editor.isActive("heading", { level })}
                  onPressedChange={() => editor.chain().focus().toggleHeading({ level }).run()}
                >
                  <Icon className="dy-h-4 dy-w-4" />
                </Toggle>
              )
            })}
          {has("bulletList") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("bulletList")}
              onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
          {has("orderedList") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("orderedList")}
              onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
          {has("blockquote") && (
            <Toggle
              size="sm"
              pressed={editor.isActive("blockquote")}
              onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="dy-h-4 dy-w-4" />
            </Toggle>
          )}
        </>
      )}

      {(inlineGroup || blockGroup) && alignGroup && <Separator />}

      {alignGroup && (
        <>
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
        </>
      )}

      {(inlineGroup || blockGroup || alignGroup) && linkGroup && <Separator />}

      {linkGroup && (
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
                <span className="dy-text-xs dy-font-medium dy-text-muted-foreground dy-uppercase dy-tracking-wider dy-block dy-mb-1.5">
                  URL
                </span>
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
      )}

      {(inlineGroup || blockGroup || alignGroup || linkGroup) && tableGroup && <Separator />}

      {tableGroup && (
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
      )}

      {has("image") && (
        <div className="dy-ml-auto">
          <React.Suspense fallback={<div className="dy-h-8 dy-w-8 dy-rounded-md dy-border dy-border-dashed dy-border-border/70 dy-bg-muted/20" />}>
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
          </React.Suspense>
        </div>
      )}
    </div>
  )
}

export function RichTextEditor({ value, onChange, label, disabled, collection = "media", features, headingLevels }: RichTextEditorProps) {
  const [editingImage, setEditingImage] = React.useState<{ pos: number; alt: string; src: string } | null>(null)
  const [tempAlt, setTempAlt] = React.useState("")

  const levels = headingLevels ?? DEFAULT_HEADING_LEVELS
  const has = (feature: RichTextFeature) => hasFeature(features, feature)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: has("bold") ? undefined : false,
        italic: has("italic") ? undefined : false,
        strike: has("strike") ? undefined : false,
        underline: has("underline") ? undefined : false,
        blockquote: has("blockquote") ? undefined : false,
        bulletList: has("bulletList") ? undefined : false,
        orderedList: has("orderedList") ? undefined : false,
        heading: has("heading") ? { levels } : false,
        link: has("link")
          ? { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } }
          : false,
      }),
      ...(has("align")
        ? [TextAlign.configure({ types: ["heading", "paragraph"] })]
        : []),
      ...(has("image")
        ? [
          Image.configure({
            HTMLAttributes: {
              class: "rounded-md max-w-full h-auto my-4 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
            },
          }),
        ]
        : []),
      ...(has("table")
        ? [
          TableKit.configure({
            table: { HTMLAttributes: { class: "dy-border-collapse dy-w-full dy-my-4" } },
            tableCell: { HTMLAttributes: { class: "dy-border dy-border-border dy-p-2 dy-align-top dy-min-w-[100px]" } },
            tableHeader: { HTMLAttributes: { class: "dy-border dy-border-border dy-p-2 dy-bg-muted dy-font-semibold dy-text-left" } },
          }),
        ]
        : []),
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
      handleClickOn(_view, _pos, node, nodePos) {
        if (node.type.name === "image") {
          setEditingImage({
            pos: nodePos,
            alt: node.attrs.alt || "",
            src: node.attrs.src || "",
          })
          setTempAlt(node.attrs.alt || "")
          return true
        }
        return false
      },
    },
  })

  const handleSaveAlt = () => {
    if (editor && editingImage) {
      const { pos } = editingImage
      const node = editor.state.doc.nodeAt(pos)
      if (node && node.type.name === "image") {
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            alt: tempAlt,
          })
        )
        onChange(editor.getHTML())
      }
    }
    setEditingImage(null)
  }

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
      {label && <span className="dy-text-sm dy-font-medium dy-leading-none dy-peer-disabled:dy-cursor-not-allowed dy-peer-disabled:dy-opacity-70">{label}</span>}
      <div className="dy-flex dy-flex-col dy-w-full">
        {!disabled && <MenuBar editor={editor} collection={collection} features={features} headingLevels={levels} />}
        <EditorContent editor={editor} className={cn(disabled && "dy-opacity-80 dy-prose prose lg:prose-xl lg:dy-prose-xl")} />
      </div>

      <Dialog open={editingImage !== null} onOpenChange={(open) => { if (!open) setEditingImage(null) }}>
        <DialogContent className="sm:dy-max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Image Alt Text</DialogTitle>
            <DialogDescription>
              Provide alternative text for accessibility (alt text) for this image.
            </DialogDescription>
          </DialogHeader>
          <div className="dy-flex dy-flex-col dy-space-y-4 dy-py-4">
            {editingImage && (
              <div className="dy-max-h-40 dy-overflow-hidden dy-rounded-md dy-border dy-bg-muted dy-flex dy-items-center dy-justify-center">
                <img
                  src={editingImage.src}
                  alt="Preview"
                  className="dy-max-h-full dy-object-contain"
                />
              </div>
            )}
            <div className="dy-space-y-2">
              <Label htmlFor="image-alt-text">Alternative Text</Label>
              <Input
                id="image-alt-text"
                value={tempAlt}
                onChange={(e) => setTempAlt(e.target.value)}
                placeholder="Describe the image..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSaveAlt()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="dy-flex dy-justify-end dy-gap-2">
            <Button variant="outline" onClick={() => setEditingImage(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAlt}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
