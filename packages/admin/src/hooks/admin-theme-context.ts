import * as React from "react"
import type { AdminThemeController } from "../controllers/theme"

export const AdminThemeContext = React.createContext<AdminThemeController | null>(null)
