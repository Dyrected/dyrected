/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { cn } from "../../lib/utils"

export interface DetailGridComponentProps {
  columns: number
  children: React.ReactNode
}

const columnClasses: Record<number, string> = {
  1: "dy-grid-cols-1",
  2: "dy-grid-cols-1 sm:dy-grid-cols-2",
  3: "dy-grid-cols-1 sm:dy-grid-cols-2 md:dy-grid-cols-3",
  4: "dy-grid-cols-1 sm:dy-grid-cols-2 md:dy-grid-cols-4",
  5: "dy-grid-cols-1 sm:dy-grid-cols-3 md:dy-grid-cols-5",
  6: "dy-grid-cols-1 sm:dy-grid-cols-3 md:dy-grid-cols-6",
  12: "dy-grid-cols-12",
}

export function DetailGridComponent({
  columns,
  children,
}: DetailGridComponentProps) {
  const colClass = columnClasses[columns] || "dy-grid-cols-1 md:dy-grid-cols-2"

  return (
    <div className={cn("dy-grid dy-gap-4 dy-w-full", colClass)}>
      {children}
    </div>
  )
}
