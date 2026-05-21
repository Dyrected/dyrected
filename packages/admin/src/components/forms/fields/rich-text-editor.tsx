import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { Toggle } from "../../ui/toggle"
import { cn } from "../../../lib/utils"
import { MediaPicker } from "./media-picker"
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
  Quote
} from "lucide-react"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  disabled?: boolean
  collection?: string
}

const MenuBar = ({ editor, collection = "media" }: { editor: Editor | null, collection?: string }) => {
  if (!editor) {
    return null
  }

  const addLink = () => {
    const url = window.prompt("URL")
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    } else if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
    }
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

      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={addLink}
      >
        <LinkIcon className="dy-h-4 dy-w-4" />
      </Toggle>

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
      StarterKit.configure({
        link: {
          openOnClick: false,
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-md max-w-full h-auto my-4",
        },
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Extract HTML for standard rich text storage
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

  // Update editor content if value changes externally (e.g. initial load)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      // Prevent cursor jump by checking if the content is actually different text-wise
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
