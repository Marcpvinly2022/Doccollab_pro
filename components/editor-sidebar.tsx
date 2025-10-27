"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Activity, MessageSquare } from "lucide-react"
import CommentsPanel from "./comments-panel"
import type { Activity as ActivityType } from "@/hooks/use-websocket"

interface EditorSidebarProps {
  documentId: string
  activeUsers: any[]
  activities: ActivityType[]
  comments: any[]
  onAddComment: (content: string) => void
}

export default function EditorSidebar({
  documentId,
  activeUsers,
  activities,
  comments,
  onAddComment,
}: EditorSidebarProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "join":
        return "👋"
      case "leave":
        return "👋"
      case "edit":
        return "✏️"
      case "comment":
        return "💬"
      default:
        return "•"
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case "join":
        return "bg-green-50 border-l-2 border-green-500"
      case "leave":
        return "bg-red-50 border-l-2 border-red-500"
      case "edit":
        return "bg-blue-50 border-l-2 border-blue-500"
      case "comment":
        return "bg-yellow-50 border-l-2 border-yellow-500"
      default:
        return "bg-gray-50"
    }
  }

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col shadow-lg">
      <Tabs defaultValue="comments" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-border">
          <TabsTrigger value="comments" className="flex-1 gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Comments</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex-1 gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden">
          <CommentsPanel
            documentId={documentId}
            comments={comments}
            onAddComment={onAddComment}
            onResolveComment={() => {}}
          />
        </TabsContent>

        {/* Active Users Tab */}
        <TabsContent value="users" className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {activeUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active users</p>
              ) : (
                activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: user.color }}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                activities.map((activity, idx) => (
                  <div key={idx} className={`p-3 rounded-lg text-sm ${getActivityColor(activity.type)}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{getActivityIcon(activity.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{activity.user}</p>
                        <p className="text-muted-foreground text-xs">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
