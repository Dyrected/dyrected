import * as React from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Image from "@tiptap/extension-image"
import { Toggle } from "../../components/ui/toggle"
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
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
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
    <div className="border border-input rounded-t-md p-1 flex flex-wrap gap-1 items-center bg-muted/50">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("underline")}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>

      <div className="w-[1px] h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 1 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="h-4 w-4" />
      </Toggle>

      <div className="w-[1px] h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "left" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "center" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive({ textAlign: "right" })}
        onPressedChange={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Toggle>

      <div className="w-[1px] h-6 bg-border mx-1" />

      <Toggle
        size="sm"
        pressed={editor.isActive("link")}
        onPressedChange={addLink}
      >
        <LinkIcon className="h-4 w-4" />
      </Toggle>
      
      <div className="ml-auto">
        <MediaPicker
          variant="icon"
          onChange={(filename) => {
            if (filename) {
              const url = `/api/media/${filename}`
              editor.chain().focus().setImage({ src: url, alt: filename }).run()
            }
          }}
        />
      </div>
    </div>
  )
}

export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
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
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // Extract HTML for standard rich text storage
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none border border-t-0 rounded-b-md border-input bg-transparent",
      },
    },
  })

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
    <div className="space-y-2">
      {label && <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{label}</label>}
      <div className="flex flex-col w-full">
        <MenuBar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
