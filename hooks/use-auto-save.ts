"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface SaveState {
  status: "idle" | "saving" | "saved" | "error"
  lastSaved: Date | null
  error: string | null
}

export function useAutoSave(
  documentId: string | null,
  content: any,
  enabled = true,
  interval = 30000, // 30 seconds
) {
  const [saveState, setSaveState] = useState<SaveState>({
    status: "idle",
    lastSaved: null,
    error: null,
  })

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastContentRef = useRef<any>(null)
  const isSavingRef = useRef(false)

  const saveDocument = useCallback(async () => {
    if (!documentId || isSavingRef.current) return

    isSavingRef.current = true
    setSaveState((prev) => ({ ...prev, status: "saving" }))

    try {
      const response = await fetch(`/documents/api/save-version/${documentId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken") || "",
        },
        body: JSON.stringify({
          content,
          summary: "Auto-saved",
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSaveState({
          status: "saved",
          lastSaved: new Date(),
          error: null,
        })

        // Reset to idle after 2 seconds
        setTimeout(() => {
          setSaveState((prev) => (prev.status === "saved" ? { ...prev, status: "idle" } : prev))
        }, 2000)
      } else {
        setSaveState({
          status: "error",
          lastSaved: saveState.lastSaved,
          error: data.error || "Failed to save",
        })
      }
    } catch (error) {
      setSaveState({
        status: "error",
        lastSaved: saveState.lastSaved,
        error: error instanceof Error ? error.message : "Save failed",
      })
    } finally {
      isSavingRef.current = false
    }
  }, [documentId, content, saveState.lastSaved])

  // Auto-save effect
  useEffect(() => {
    if (!enabled || !documentId || !content) return

    // Check if content has changed
    if (JSON.stringify(lastContentRef.current) === JSON.stringify(content)) {
      return
    }

    lastContentRef.current = content

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, interval)

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [content, enabled, documentId, interval, saveDocument])

  return {
    ...saveState,
    save: saveDocument,
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null
  return null
}
