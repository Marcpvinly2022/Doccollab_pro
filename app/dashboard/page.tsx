"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Lock, Globe } from "lucide-react"
import PermissionsIndicator from "@/components/permissions-indicator"

interface Document {
  id: number
  title: string
  owner: string
  is_public: boolean
  created_at: string
  updated_at: string
  permission?: "owner" | "editor" | "viewer"
}

export default function DashboardPage() {
  const [ownedDocuments, setOwnedDocuments] = useState<Document[]>([])
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [newDocTitle, setNewDocTitle] = useState("")

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch("/documents/api/documents/")
      const data = await response.json()
      setOwnedDocuments(data.owned_documents || [])
      setSharedDocuments(data.shared_documents || [])
    } catch (error) {
      console.error("[v0] Error loading documents:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) return

    try {
      const formData = new FormData()
      formData.append("title", newDocTitle)

      const response = await fetch("/documents/create/", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        setNewDocTitle("")
        loadDocuments()
      }
    } catch (error) {
      console.error("[v0] Error creating document:", error)
    }
  }

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      await fetch(`/documents/api/delete/${docId}/`, {
        method: "DELETE",
      })
      loadDocuments()
    } catch (error) {
      console.error("[v0] Error deleting document:", error)
    }
  }

  const openDocument = (docId: number) => {
    window.location.href = `/editor?id=${docId}`
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Documents</h1>
          <p className="text-muted-foreground">Create and manage your collaborative documents</p>
        </div>

        {/* Create New Document */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Create New Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Document title..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCreateDocument()
                  }
                }}
              />
              <Button onClick={handleCreateDocument} disabled={!newDocTitle.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Tabs */}
        <Tabs defaultValue="owned" className="w-full">
          <TabsList>
            <TabsTrigger value="owned">Owned ({ownedDocuments.length})</TabsTrigger>
            <TabsTrigger value="shared">Shared ({sharedDocuments.length})</TabsTrigger>
          </TabsList>

          {/* Owned Documents */}
          <TabsContent value="owned" className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : ownedDocuments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No documents yet. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {ownedDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0" onClick={() => openDocument(doc.id)}>
                          <h3 className="font-semibold truncate">{doc.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                            {doc.is_public ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                <span>Public</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                <span>Private</span>
                              </div>
                            )}
                            <span className="text-xs text-muted-foreground">
                              Updated {new Date(doc.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => openDocument(doc.id)}>
                            Open
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shared Documents */}
          <TabsContent value="shared" className="space-y-4">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : sharedDocuments.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No documents shared with you yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {sharedDocuments.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0" onClick={() => openDocument(doc.id)}>
                          <h3 className="font-semibold truncate">{doc.title}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <PermissionsIndicator permission={doc.permission || "viewer"} username={doc.owner} />
                            <span className="text-xs text-muted-foreground">Shared by {doc.owner}</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openDocument(doc.id)}>
                          Open
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
