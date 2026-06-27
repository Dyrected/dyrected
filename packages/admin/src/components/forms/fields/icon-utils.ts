import { icons, type LucideIcon } from "lucide-react"

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "actions", label: "Actions", keywords: ["save", "edit", "trash", "delete", "check", "close", "x", "plus", "minus", "ban", "play", "pause", "stop", "power", "add", "remove", "clear"] },
  { id: "navigation", label: "Navigation", keywords: ["chevron", "arrow", "align", "move", "scroll", "map", "pin", "compass", "globe", "search", "home", "menu"] },
  { id: "communication", label: "Communication", keywords: ["mail", "message", "chat", "send", "phone", "share", "user", "users", "heart", "star", "bell", "gift", "hash"] },
  { id: "files", label: "Files & Folders", keywords: ["file", "folder", "doc", "archive", "book", "copy", "clip", "database", "sheet", "table"] },
  { id: "devices", label: "Devices & Media", keywords: ["monitor", "phone", "tablet", "laptop", "watch", "server", "drive", "wifi", "bluetooth", "battery", "camera", "image", "video", "music", "play"] },
  { id: "editors", label: "Editors", keywords: ["bold", "italic", "underline", "link", "code", "quote", "type", "text", "scissors", "pen", "brush", "crop"] },
  { id: "finance", label: "Finance & Shop", keywords: ["credit", "card", "dollar", "bank", "shop", "cart", "tag", "coin", "wallet"] },
  { id: "utilities", label: "Utilities", keywords: ["settings", "cog", "slider", "eye", "lock", "key", "info", "help", "shield", "sun", "moon", "cloud", "bell", "clock", "calendar"] },
  { id: "others", label: "Others", keywords: [] }
]

export const getIconCategory = (name: string): string => {
  const lowercaseName = name.toLowerCase()
  for (const cat of CATEGORIES) {
    if (cat.id === "all" || cat.id === "others") continue
    if (cat.keywords.some(keyword => lowercaseName.includes(keyword))) {
      return cat.id
    }
  }
  return "others"
}

export type IconName = keyof typeof icons

export const availableIconNames = Object.keys(icons) as IconName[]

export function getIcon(name: string): LucideIcon | undefined {
  return icons[name as IconName]
}
