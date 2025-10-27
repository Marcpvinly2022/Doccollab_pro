"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, RotateCcw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCookie } from "cookies-next"

interface Version {
  id: number
  version_number: number
  created_at: string
  created_by: string
  change_summary: string
}

interface VersionHistoryProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
}

export default function VersionHistory({ documentId, isOpen, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadVersions()
    }
  }, [isOpen, documentId])

  const loadVersions = async () => {
    try {
      const response = await fetch(`/documents/api/versions/${documentId}/`)
      const data = await response.json()
      setVersions(data.versions || [])
    } catch (error) {
      console.error("[v0] Error loading versions:", error)
      toast({
        title: "Error",
        description: "Failed to load version history",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRestoreVersion = async (versionId: number) => {
    if (!confirm("Are you sure you want to restore this version?")) return

    setRestoring(versionId)
    try {
      const response = await fetch(`/documents/api/restore/${documentId}/${versionId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Version restored successfully",
        })
        window.location.reload()
      } else {
        toast({
          title: "Error",
          description: "Failed to restore version",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      })
    } finally {
      setRestoring(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
          <DialogDescription>View and restore previous versions of this document</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-96 border rounded-lg p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading versions...</p>
          ) : versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet</p>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="p-3 rounded-lg border border-border hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="font-medium text-sm">v{version.version_number}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">by {version.created_by}</p>
                      {version.change_summary && (
                        <p className="text-xs text-foreground mt-1">{version.change_summary}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestoreVersion(version.id)}
                      disabled={restoring === version.id}
                      className="flex-shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
