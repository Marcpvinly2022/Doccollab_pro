"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Check, Reply } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getCookie } from "cookies-next"

interface Comment {
  id: number
  user: string
  content: string
  timestamp: string
  position: number
  resolved: boolean
  replies?: Comment[]
}

interface CommentsPanelProps {
  documentId: string
  comments: Comment[]
  onAddComment: (content: string, position?: number) => void
  onResolveComment: (commentId: number) => void
}

export default function CommentsPanel({ documentId, comments, onAddComment, onResolveComment }: CommentsPanelProps) {
  const [commentText, setCommentText] = useState("")
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [loadingComments, setLoadingComments] = useState(false)
  const { toast } = useToast()

  const handleAddComment = () => {
    if (commentText.trim()) {
      onAddComment(commentText)
      setCommentText("")
    }
  }

  const handleAddReply = async (parentCommentId: number) => {
    if (!replyText.trim()) return

    try {
      const response = await fetch(`/documents/api/comment-reply/${documentId}/${parentCommentId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify({
          content: replyText,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setReplyText("")
        setReplyingTo(null)
        toast({
          title: "Success",
          description: "Reply added",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add reply",
        variant: "destructive",
      })
    }
  }

  const handleResolveComment = async (commentId: number) => {
    try {
      const response = await fetch(`/documents/api/resolve-comment/${documentId}/${commentId}/`, {
        method: "POST",
        headers: {
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
      })

      const data = await response.json()

      if (data.success) {
        onResolveComment(commentId)
        toast({
          title: "Success",
          description: "Comment resolved",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve comment",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageSquare className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.resolved ? "bg-muted border-muted-foreground/20" : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{comment.user}</p>
                      {comment.resolved && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">Resolved</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(comment.timestamp).toLocaleString()}</p>
                  </div>
                  {!comment.resolved && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolveComment(comment.id)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <p className="text-sm text-foreground mt-2">{comment.content}</p>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 space-y-2 pl-3 border-l-2 border-muted-foreground/20">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="text-sm">
                        <p className="font-medium text-xs">{reply.user}</p>
                        <p className="text-xs text-muted-foreground">{reply.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(reply.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Button */}
                {!comment.resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="mt-2 h-6 text-xs gap-1"
                  >
                    <Reply className="h-3 w-3" />
                    Reply
                  </Button>
                )}

                {/* Reply Input */}
                {replyingTo === comment.id && (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyText.trim()}
                        className="text-xs"
                      >
                        Reply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null)
                          setReplyText("")
                        }}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Comment Input */}
      <div className="border-t border-border p-4 space-y-2">
        <Input
          placeholder="Add a comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAddComment()
            }
          }}
          className="text-sm"
        />
        <Button onClick={handleAddComment} size="sm" className="w-full" disabled={!commentText.trim()}>
          Comment
        </Button>
      </div>
    </div>
  )
}
