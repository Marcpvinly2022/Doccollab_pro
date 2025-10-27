"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, RotateCcw, GitCompare } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCookie } from "cookies-next"
import VersionComparison from "./version-comparison"

interface Version {
  id: number
  version_number: number
  created_at: string
  created_by: string
  change_summary: string
  content: any
}

interface EnhancedVersionHistoryProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
}

export default function EnhancedVersionHistory({ documentId, isOpen, onClose }: EnhancedVersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState<number | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<[number | null, number | null]>([null, null])
  const [showComparison, setShowComparison] = useState(false)
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

  const handleSelectVersion = (versionId: number) => {
    if (selectedVersions[0] === null) {
      setSelectedVersions([versionId, null])
    } else if (selectedVersions[1] === null) {
      setSelectedVersions([selectedVersions[0], versionId])
      setShowComparison(true)
    } else {
      setSelectedVersions([versionId, null])
    }
  }

  const getSelectedVersion = (index: 0 | 1): Version | undefined => {
    const versionId = selectedVersions[index]
    return versionId ? versions.find((v) => v.id === versionId) : undefined
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>View, compare, and restore previous versions of this document</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4">
            {/* Version List */}
            <div className="col-span-2">
              <ScrollArea className="h-96 border rounded-lg p-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading versions...</p>
                ) : versions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No versions yet</p>
                ) : (
                  <div className="space-y-2">
                    {versions.map((version) => (
                      <div
                        key={version.id}
                        onClick={() => handleSelectVersion(version.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedVersions.includes(version.id)
                            ? "bg-blue-50 border-blue-300"
                            : "hover:bg-muted border-border"
                        }`}
                      >
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
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestoreVersion(version.id)
                            }}
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
            </div>

            {/* Selection Info */}
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs font-medium mb-2">Selected for Comparison</p>
                <div className="space-y-2">
                  {selectedVersions[0] !== null ? (
                    <div className="text-xs">
                      <p className="font-medium">Version {getSelectedVersion(0)?.version_number}</p>
                      <p className="text-muted-foreground text-xs">
                        {getSelectedVersion(0) && new Date(getSelectedVersion(0)!.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select first version</p>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted border border-border">
                <p className="text-xs font-medium mb-2">Compare With</p>
                <div className="space-y-2">
                  {selectedVersions[1] !== null ? (
                    <div className="text-xs">
                      <p className="font-medium">Version {getSelectedVersion(1)?.version_number}</p>
                      <p className="text-muted-foreground text-xs">
                        {getSelectedVersion(1) && new Date(getSelectedVersion(1)!.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select second version</p>
                  )}
                </div>
              </div>

              <Button
                onClick={() => setShowComparison(true)}
                disabled={selectedVersions[0] === null || selectedVersions[1] === null}
                className="w-full gap-2"
              >
                <GitCompare className="h-4 w-4" />
                Compare
              </Button>

              <Button variant="outline" onClick={() => setSelectedVersions([null, null])} className="w-full">
                Clear
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Version Comparison Dialog */}
      {selectedVersions[0] !== null && selectedVersions[1] !== null && (
        <VersionComparison
          isOpen={showComparison}
          onClose={() => setShowComparison(false)}
          version1={
            getSelectedVersion(0)
              ? {
                  number: getSelectedVersion(0)!.version_number,
                  content: getSelectedVersion(0)!.content,
                  createdAt: getSelectedVersion(0)!.created_at,
                }
              : null
          }
          version2={
            getSelectedVersion(1)
              ? {
                  number: getSelectedVersion(1)!.version_number,
                  content: getSelectedVersion(1)!.content,
                  createdAt: getSelectedVersion(1)!.created_at,
                }
              : null
          }
        />
      )}
    </>
  )
}
