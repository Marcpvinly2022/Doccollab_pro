"use client"

import { useEffect, useState, useCallback, useRef } from "react"

export interface RemoteCursor {
  id: number
  username: string
  color: string
  position: number
  selectionStart: number
  selectionEnd: number
  lastUpdated: number
}

interface ActiveUser {
  id: number
  username: string
  color: string
  cursor_position: number
}

interface Activity {
  user: string
  description: string
  timestamp: string
  type: "join" | "leave" | "edit" | "comment"
}

interface Comment {
  user: string
  content: string
  timestamp: string
}

export function useWebSocket(documentId: string | null) {
  const [isConnected, setIsConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [remoteCursors, setRemoteCursors] = useState<Map<number, RemoteCursor>>(new Map())
  const [activities, setActivities] = useState<Activity[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const cursorTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map())

  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...data }))
    }
  }, [])

  const sendEdit = useCallback(
    (content: any) => {
      sendMessage("edit", { content })
    },
    [sendMessage],
  )

  const sendCursor = useCallback(
    (position: number, selectionStart = 0, selectionEnd = 0) => {
      sendMessage("cursor", { position, selection_start: selectionStart, selection_end: selectionEnd })
    },
    [sendMessage],
  )

  const sendComment = useCallback(
    (content: string) => {
      sendMessage("comment", { content, position: 0 })
    },
    [sendMessage],
  )

  const updateRemoteCursor = useCallback((cursor: RemoteCursor) => {
    setRemoteCursors((prev) => new Map(prev).set(cursor.id, cursor))

    // Clear existing timeout for this user
    const existingTimeout = cursorTimeoutRef.current.get(cursor.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set timeout to remove cursor after 5 seconds of inactivity
    const timeout = setTimeout(() => {
      setRemoteCursors((prev) => {
        const updated = new Map(prev)
        updated.delete(cursor.id)
        return updated
      })
      cursorTimeoutRef.current.delete(cursor.id)
    }, 5000)

    cursorTimeoutRef.current.set(cursor.id, timeout)
  }, [])

  useEffect(() => {
    if (!documentId) return

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${protocol}//${window.location.host}/ws/document/${documentId}/`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log("[v0] WebSocket connected")
      setIsConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log("[v0] WebSocket message:", data.type)

        if (data.type === "document_load") {
          setActiveUsers(data.active_users || [])
        } else if (data.type === "user_joined") {
          setActiveUsers((prev) => [
            ...prev,
            {
              id: data.user_id,
              username: data.username,
              color: data.color || "#3B82F6",
              cursor_position: 0,
            },
          ])
          setActivities((prev) => [
            {
              user: data.username,
              description: "joined the document",
              timestamp: new Date().toISOString(),
              type: "join",
            },
            ...prev.slice(0, 19),
          ])
        } else if (data.type === "user_left") {
          setActiveUsers((prev) => prev.filter((u) => u.id !== data.user_id))
          setRemoteCursors((prev) => {
            const updated = new Map(prev)
            updated.delete(data.user_id)
            return updated
          })
          setActivities((prev) => [
            {
              user: data.username,
              description: "left the document",
              timestamp: new Date().toISOString(),
              type: "leave",
            },
            ...prev.slice(0, 19),
          ])
        } else if (data.type === "edit") {
          setActivities((prev) => [
            {
              user: data.username,
              description: "edited the document",
              timestamp: new Date().toISOString(),
              type: "edit",
            },
            ...prev.slice(0, 19),
          ])
        } else if (data.type === "cursor") {
          const user = activeUsers.find((u) => u.id === data.user_id)
          if (user) {
            updateRemoteCursor({
              id: data.user_id,
              username: data.username,
              color: user.color,
              position: data.position,
              selectionStart: data.selection_start || 0,
              selectionEnd: data.selection_end || 0,
              lastUpdated: Date.now(),
            })
          }
        } else if (data.type === "comment") {
          setComments((prev) => [
            {
              user: data.username,
              content: data.content,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ])
          setActivities((prev) => [
            {
              user: data.username,
              description: "added a comment",
              timestamp: new Date().toISOString(),
              type: "comment",
            },
            ...prev.slice(0, 19),
          ])
        }
      } catch (error) {
        console.error("[v0] WebSocket message error:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("[v0] WebSocket error:", error)
      setIsConnected(false)
    }

    ws.onclose = () => {
      console.log("[v0] WebSocket disconnected")
      setIsConnected(false)
    }

    wsRef.current = ws

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      // Cleanup timeouts
      cursorTimeoutRef.current.forEach((timeout) => clearTimeout(timeout))
      cursorTimeoutRef.current.clear()
    }
  }, [documentId, activeUsers, updateRemoteCursor])

  return {
    isConnected,
    activeUsers,
    remoteCursors,
    activities,
    comments,
    sendEdit,
    sendCursor,
    sendComment,
  }
}
