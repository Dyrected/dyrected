import { cn } from "../../lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("dy-animate-pulse dy-rounded-md dy-bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
