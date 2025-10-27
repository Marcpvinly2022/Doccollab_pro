"use client"

import { useEffect, useState } from "react"
import type { RemoteCursor } from "@/hooks/use-websocket"
import type React from "react" // Added import for React

interface RemoteCursorsProps {
  cursors: Map<number, RemoteCursor>
  editorContainer: React.RefObject<HTMLDivElement>
}

export default function RemoteCursors({ cursors, editorContainer }: RemoteCursorsProps) {
  const [cursorElements, setCursorElements] = useState<React.JSX.Element[]>([]) // Updated JSX.Element to React.JSX.Element

  useEffect(() => {
    const elements: React.JSX.Element[] = [] // Updated JSX.Element to React.JSX.Element

    cursors.forEach((cursor) => {
      elements.push(
        <div
          key={`cursor-${cursor.id}`}
          className="absolute pointer-events-none"
          style={{
            left: `${cursor.position * 8}px`,
            top: "0px",
            zIndex: 10,
          }}
        >
          {/* Cursor line */}
          <div
            className="w-0.5 h-6 animate-pulse"
            style={{
              backgroundColor: cursor.color,
              boxShadow: `0 0 4px ${cursor.color}`,
            }}
          />
          {/* Username label */}
          <div
            className="absolute top-6 left-0 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
            style={{
              backgroundColor: cursor.color,
              fontSize: "11px",
            }}
          >
            {cursor.username}
          </div>
        </div>,
      )

      // Show selection highlight if user has selection
      if (cursor.selectionStart !== cursor.selectionEnd) {
        elements.push(
          <div
            key={`selection-${cursor.id}`}
            className="absolute pointer-events-none opacity-30"
            style={{
              left: `${Math.min(cursor.selectionStart, cursor.selectionEnd) * 8}px`,
              top: "0px",
              width: `${Math.abs(cursor.selectionEnd - cursor.selectionStart) * 8}px`,
              height: "24px",
              backgroundColor: cursor.color,
              zIndex: 5,
            }}
          />,
        )
      }
    })

    setCursorElements(elements)
  }, [cursors])

  return <div className="absolute inset-0 pointer-events-none">{cursorElements}</div>
}
