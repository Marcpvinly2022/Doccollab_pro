"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Link from "@tiptap/extension-link"
import Underline from "@tiptap/extension-underline"
import { useEffect } from "react"
import EditorToolbar from "./editor-toolbar"
import RemoteCursors from "./remote-cursors"
import type { RemoteCursor } from "@/hooks/use-websocket"

interface TiptapEditorProps {
  documentId: string | null
  initialContent?: any
  remoteCursors: Map<number, RemoteCursor>
  onEdit: (content: any) => void
  onCursorMove: (position: number, selectionStart: number, selectionEnd: number) => void
}

export default function TiptapEditor({
  documentId,
  initialContent,
  remoteCursors,
  onEdit,
  onCursorMove,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: "Start typing...",
      }),
      Link.configure({
        openOnClick: false,
      }),
      Underline,
    ],
    content: initialContent || "<p></p>",
    onUpdate: ({ editor }) => {
      const json = editor.getJSON()
      onEdit(json)
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      onCursorMove(from, from, to)
    },
  })

  useEffect(() => {
    if (editor && initialContent && typeof initialContent === "object") {
      editor.commands.setContent(initialContent)
    }
  }, [editor, initialContent])

  if (!editor) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <EditorToolbar editor={editor} documentId={documentId || undefined} />
      <div className="flex-1 overflow-auto bg-background relative">
        <div className="w-full max-w-4xl mx-auto p-8 relative">
          <RemoteCursors cursors={remoteCursors} editorContainer={undefined} />
          <EditorContent editor={editor} className="prose prose-sm dark:prose-invert max-w-none focus:outline-none" />
        </div>
      </div>
    </div>
  )
}
