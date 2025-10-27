"use client"

import { Check, AlertCircle, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

interface SaveStatusProps {
  status: "idle" | "saving" | "saved" | "error"
  lastSaved: Date | null
  error: string | null
}

export default function SaveStatus({ status, lastSaved, error }: SaveStatusProps) {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    if (status === "saving") {
      setDisplayText("Saving...")
    } else if (status === "saved") {
      setDisplayText("Saved")
    } else if (status === "error") {
      setDisplayText("Save failed")
    } else if (lastSaved) {
      const now = new Date()
      const diffSeconds = Math.floor((now.getTime() - lastSaved.getTime()) / 1000)

      if (diffSeconds < 60) {
        setDisplayText("Just now")
      } else if (diffSeconds < 3600) {
        const minutes = Math.floor(diffSeconds / 60)
        setDisplayText(`${minutes}m ago`)
      } else {
        const hours = Math.floor(diffSeconds / 3600)
        setDisplayText(`${hours}h ago`)
      }
    } else {
      setDisplayText("Not saved")
    }
  }, [status, lastSaved])

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted">
      {status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
      {status === "saved" && <Check className="h-4 w-4 text-green-600" />}
      {status === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
      {status === "idle" && lastSaved && <Check className="h-4 w-4 text-gray-600" />}

      <span className="text-xs text-muted-foreground">{displayText}</span>

      {error && <span className="text-xs text-red-600 ml-1">{error}</span>}
    </div>
  )
}
