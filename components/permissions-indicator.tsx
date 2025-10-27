"use client"

import { Shield, Eye, Edit } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface PermissionsIndicatorProps {
  permission: "viewer" | "editor" | "owner"
  username?: string
}

export default function PermissionsIndicator({ permission, username }: PermissionsIndicatorProps) {
  const getPermissionDetails = () => {
    switch (permission) {
      case "owner":
        return {
          icon: Shield,
          label: "Owner",
          description: "Full control over this document",
          color: "text-purple-600",
        }
      case "editor":
        return {
          icon: Edit,
          label: "Editor",
          description: "Can view and edit this document",
          color: "text-blue-600",
        }
      case "viewer":
        return {
          icon: Eye,
          label: "Viewer",
          description: "Can only view this document",
          color: "text-gray-600",
        }
    }
  }

  const details = getPermissionDetails()
  const Icon = details.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <Icon className={`h-4 w-4 ${details.color}`} />
            <span className="text-xs font-medium">{details.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{details.description}</p>
          {username && <p className="text-xs text-muted-foreground">{username}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
