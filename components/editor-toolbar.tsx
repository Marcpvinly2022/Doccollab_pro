"use client"

import type React from "react"

import type { Editor } from "@tiptap/react"
import {
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  Undo2,
  Redo2,
  Clock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState } from "react"
import EnhancedVersionHistory from "./enhanced-version-history"

interface EditorToolbarProps {
  editor: Editor
  documentId?: string
}

export default function EditorToolbar({ editor, documentId }: EditorToolbarProps) {
  const [showVersionHistory, setShowVersionHistory] = useState(false)

  const addLink = () => {
    const url = window.prompt("Enter URL:")
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
    }
  }

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    title,
  }: {
    onClick: () => void
    isActive: boolean
    icon: React.ComponentType<{ className?: string }>
    title: string
  }) => (
    <Button onClick={onClick} variant={isActive ? "default" : "ghost"} size="sm" title={title} className="h-8 w-8 p-0">
      <Icon className="h-4 w-4" />
    </Button>
  )

  return (
    <>
      <div className="bg-card border-b border-border p-3 flex gap-1 flex-wrap shadow-sm">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} isActive={false} icon={Undo2} title="Undo" />
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} isActive={false} icon={Redo2} title="Redo" />

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={Bold}
          title="Bold"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={Italic}
          title="Italic"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive("underline")}
          icon={UnderlineIcon}
          title="Underline"
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          icon={Heading1}
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          icon={Heading2}
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          icon={Heading3}
          title="Heading 3"
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={List}
          title="Bullet List"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={ListOrdered}
          title="Ordered List"
        />

        <Separator orientation="vertical" className="h-6" />

        {/* Other */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          icon={Code}
          title="Code Block"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          icon={Quote}
          title="Blockquote"
        />
        <ToolbarButton onClick={addLink} isActive={editor.isActive("link")} icon={LinkIcon} title="Link" />

        <Separator orientation="vertical" className="h-6" />

        {/* Version History */}
        {documentId && (
          <Button
            onClick={() => setShowVersionHistory(true)}
            variant="ghost"
            size="sm"
            title="Version History"
            className="h-8 w-8 p-0"
          >
            <Clock className="h-4 w-4" />
          </Button>
        )}
      </div>

      {documentId && (
        <EnhancedVersionHistory
          documentId={documentId}
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
        />
      )}
    </>
  )
}
