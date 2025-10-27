"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { getCookie } from "cookies-next"
import { Copy, Trash2, Globe, Lock } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"

interface SharedUser {
  id: number
  username: string
  permission: "viewer" | "editor"
  shared_at: string
}

interface ShareModalProps {
  documentId: string
  isOpen: boolean
  onClose: () => void
}

export default function ShareModal({ documentId, isOpen, onClose }: ShareModalProps) {
  const [username, setUsername] = useState("")
  const [permission, setPermission] = useState("editor")
  const [loading, setLoading] = useState(false)
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([])
  const [isPublic, setIsPublic] = useState(false)
  const [shareLink, setShareLink] = useState("")
  const [loadingUsers, setLoadingUsers] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      loadSharedUsers()
      loadDocumentSettings()
    }
  }, [isOpen, documentId])

  const loadSharedUsers = async () => {
    try {
      const response = await fetch(`/documents/api/shared-users/${documentId}/`)
      const data = await response.json()
      setSharedUsers(data.shared_users || [])
    } catch (error) {
      console.error("[v0] Error loading shared users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadDocumentSettings = async () => {
    try {
      const response = await fetch(`/documents/api/document/${documentId}/`)
      const data = await response.json()
      setIsPublic(data.is_public || false)
      if (data.is_public) {
        setShareLink(`${window.location.origin}/documents/editor/${documentId}/`)
      }
    } catch (error) {
      console.error("[v0] Error loading document settings:", error)
    }
  }

  const handleShare = async () => {
    if (!username.trim()) {
      toast({
        title: "Error",
        description: "Please enter a username",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/documents/api/share/${documentId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify({
          username,
          permission,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Document shared with ${username}`,
        })
        setUsername("")
        setPermission("editor")
        loadSharedUsers()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to share document",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share document",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAccess = async (userId: number) => {
    try {
      const response = await fetch(`/documents/api/revoke-access/${documentId}/${userId}/`, {
        method: "DELETE",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Access revoked",
        })
        loadSharedUsers()
      } else {
        toast({
          title: "Error",
          description: "Failed to revoke access",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive",
      })
    }
  }

  const handleTogglePublic = async () => {
    try {
      const response = await fetch(`/documents/api/toggle-public/${documentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
      })

      const data = await response.json()

      if (data.success) {
        setIsPublic(data.is_public)
        if (data.is_public) {
          setShareLink(`${window.location.origin}/documents/editor/${documentId}/`)
          toast({
            title: "Success",
            description: "Document is now public",
          })
        } else {
          setShareLink("")
          toast({
            title: "Success",
            description: "Document is now private",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to toggle public status",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink)
    toast({
      title: "Copied",
      description: "Share link copied to clipboard",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Document</DialogTitle>
          <DialogDescription>Manage who can access this document</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="access">Access</TabsTrigger>
          </TabsList>

          {/* Share Tab */}
          <TabsContent value="share" className="space-y-4">
            {/* Public/Private Toggle */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span className="font-medium text-sm">{isPublic ? "Public" : "Private"}</span>
                </div>
                <Button
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={handleTogglePublic}
                  className="text-xs"
                >
                  {isPublic ? "Make Private" : "Make Public"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isPublic
                  ? "Anyone with the link can view this document"
                  : "Only people you share with can access this document"}
              </p>
            </div>

            {/* Public Link */}
            {isPublic && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Share Link</label>
                <div className="flex gap-2">
                  <Input value={shareLink} readOnly className="text-xs" />
                  <Button size="sm" variant="outline" onClick={copyToClipboard} className="px-2 bg-transparent">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Share with User */}
            <div className="space-y-3 border-t pt-4">
              <label className="text-sm font-medium">Share with User</label>
              <div className="space-y-2">
                <Input
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleShare()
                    }
                  }}
                />
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                    <SelectItem value="editor">Editor (Can Edit)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleShare} disabled={loading} className="w-full">
                  {loading ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Access Tab */}
          <TabsContent value="access" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-3">
              {sharedUsers.length === 0 ? "No users have access yet" : `${sharedUsers.length} user(s) have access`}
            </div>

            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-2">
                {loadingUsers ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : sharedUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No shared users</p>
                ) : (
                  sharedUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground capitalize">{user.permission}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(user.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
