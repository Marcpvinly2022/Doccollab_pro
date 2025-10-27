"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Share2, ArrowLeft, Wifi, WifiOff, Lock, Globe, Save } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import ShareModal from "./share-modal"
import SaveStatus from "./save-status"

interface EditorHeaderProps {
  document: any
  isConnected: boolean
  saveState: {
    status: "idle" | "saving" | "saved" | "error"
    lastSaved: Date | null
    error: string | null
  }
  onManualSave: () => void
}

export default function EditorHeader({ document, isConnected, saveState, onManualSave }: EditorHeaderProps) {
  const [showShareModal, setShowShareModal] = useState(false)
  const [title, setTitle] = useState(document?.title || "Untitled Document")

  const handleTitleChange = async (newTitle: string) => {
    setTitle(newTitle)
    // TODO: Save title to backend
  }

  const handleDownload = (format: string) => {
    window.location.href = `/documents/api/download/${document.id}/?format=${format}`
  }

  return (
    <>
      <div className="bg-card border-b border-border p-4 flex justify-between items-center shadow-sm">
        <div className="flex-1 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/dashboard")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="text-xl font-bold border-0 bg-transparent focus-visible:ring-0 px-0"
            placeholder="Untitled Document"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs">
            {document?.is_public ? (
              <>
                <Globe className="h-3 w-3" />
                <span>Public</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" />
                <span>Private</span>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* Save Status */}
          <SaveStatus status={saveState.status} lastSaved={saveState.lastSaved} error={saveState.error} />

          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-xs text-muted-foreground">Offline</span>
              </>
            )}
          </div>

          {/* Manual Save */}
          <Button
            variant="outline"
            size="sm"
            onClick={onManualSave}
            disabled={saveState.status === "saving"}
            className="gap-2 bg-transparent"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>

          {/* Download */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDownload("txt")}>Download as TXT</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("docx")}>Download as DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload("pdf")}>Download as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Share */}
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      <ShareModal documentId={document?.id} isOpen={showShareModal} onClose={() => setShowShareModal(false)} />
    </>
  )
}
