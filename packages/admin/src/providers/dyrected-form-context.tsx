import * as React from "react"
import type { DyrectedFormController } from "../controllers/form"

const DyrectedFormContext = React.createContext<DyrectedFormController | null>(null)
const DyrectedFieldPathContext = React.createContext<string | null>(null)

export interface DyrectedFormProviderProps {
  controller: DyrectedFormController
  children: React.ReactNode
}

export function DyrectedFormProvider({ controller, children }: DyrectedFormProviderProps) {
  return (
    <DyrectedFormContext.Provider value={controller}>
      {children}
    </DyrectedFormContext.Provider>
  )
}

export interface DyrectedFieldPathProviderProps {
  path: string
  children: React.ReactNode
}

export function DyrectedFieldPathProvider({
  path,
  children,
}: DyrectedFieldPathProviderProps) {
  return (
    <DyrectedFieldPathContext.Provider value={path}>
      {children}
    </DyrectedFieldPathContext.Provider>
  )
}

export function useDyrectedFormControllerContext(): DyrectedFormController {
  const controller = React.useContext(DyrectedFormContext)
  if (!controller) {
    throw new Error("useDyrectedForm must be used within a DyrectedFormProvider")
  }
  return controller
}

export function useDyrectedFieldPathContext(): string | null {
  return React.useContext(DyrectedFieldPathContext)
}
