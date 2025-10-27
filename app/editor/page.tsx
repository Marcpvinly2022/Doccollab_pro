"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import TiptapEditor from "@/components/tiptap-editor"
import EditorSidebar from "@/components/editor-sidebar"
import EditorHeader from "@/components/editor-header"
import { useWebSocket } from "@/hooks/use-websocket"
import { useAutoSave } from "@/hooks/use-auto-save"

export default function EditorPage() {
  const searchParams = useSearchParams()
  const documentId = searchParams.get("id")
  const [document, setDocument] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentContent, setCurrentContent] = useState<any>(null)

  const { isConnected, activeUsers, remoteCursors, activities, comments, sendEdit, sendCursor, sendComment } =
    useWebSocket(documentId)

  const { status, lastSaved, error: saveError, save: manualSave } = useAutoSave(documentId, currentContent, true, 30000)

  useEffect(() => {
    if (!documentId) {
      setError("No document ID provided")
      setLoading(false)
      return
    }

    // Fetch document metadata from Django backend
    fetch(`/documents/api/document/${documentId}/`)
      .then((res) => res.json())
      .then((data) => {
        setDocument(data)
        setCurrentContent(data.content)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [documentId])

  const handleEdit = (content: any) => {
    setCurrentContent(content)
    sendEdit(content)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <a href="/dashboard" className="text-primary hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        <EditorHeader
          document={document}
          isConnected={isConnected}
          saveState={{ status, lastSaved, error: saveError }}
          onManualSave={manualSave}
        />
        <TiptapEditor
          documentId={documentId}
          initialContent={document?.content}
          remoteCursors={remoteCursors}
          onEdit={handleEdit}
          onCursorMove={(position, start, end) => sendCursor(position, start, end)}
        />
      </div>

      {/* Sidebar */}
      <EditorSidebar activeUsers={activeUsers} activities={activities} comments={comments} onAddComment={sendComment} />
    </div>
  )
}
