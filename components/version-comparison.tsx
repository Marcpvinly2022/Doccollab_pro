"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface VersionComparisonProps {
  isOpen: boolean
  onClose: () => void
  version1: {
    number: number
    content: string
    createdAt: string
  } | null
  version2: {
    number: number
    content: string
    createdAt: string
  } | null
}

export default function VersionComparison({ isOpen, onClose, version1, version2 }: VersionComparisonProps) {
  if (!version1 || !version2) return null

  const extractText = (content: any): string => {
    if (typeof content === "string") return content
    if (typeof content === "object" && content.content) {
      return content.content.map((node: any) => extractText(node)).join("\n")
    }
    return ""
  }

  const text1 = extractText(version1.content)
  const text2 = extractText(version2.content)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-96">
        <DialogHeader>
          <DialogTitle>Compare Versions</DialogTitle>
          <DialogDescription>
            Comparing v{version1.number} ({new Date(version1.createdAt).toLocaleString()}) with v{version2.number} (
            {new Date(version2.createdAt).toLocaleString()})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="side-by-side" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="unified">Unified</TabsTrigger>
          </TabsList>

          <TabsContent value="side-by-side" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm mb-2">Version {version1.number}</h3>
                <ScrollArea className="h-64 border rounded-lg p-4 bg-muted">
                  <p className="text-sm whitespace-pre-wrap">{text1}</p>
                </ScrollArea>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Version {version2.number}</h3>
                <ScrollArea className="h-64 border rounded-lg p-4 bg-muted">
                  <p className="text-sm whitespace-pre-wrap">{text2}</p>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="unified" className="space-y-4">
            <ScrollArea className="h-96 border rounded-lg p-4 bg-muted">
              <div className="space-y-2 text-sm font-mono">
                <div className="text-red-600">
                  <p>--- Version {version1.number}</p>
                  <p className="whitespace-pre-wrap">{text1}</p>
                </div>
                <div className="text-green-600">
                  <p>+++ Version {version2.number}</p>
                  <p className="whitespace-pre-wrap">{text2}</p>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
