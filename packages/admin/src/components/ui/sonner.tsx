import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="dy-toaster dy-group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:dy-bg-background group-[.toaster]:dy-text-foreground group-[.toaster]:dy-border-border group-[.toaster]:dy-shadow-lg group-[.toaster]:dy-rounded-xl",
          description: "group-[.toast]:dy-text-muted-foreground",
          actionButton:
            "group-[.toast]:dy-bg-primary group-[.toast]:dy-text-primary-foreground",
          cancelButton:
            "group-[.toast]:dy-bg-muted group-[.toast]:dy-text-muted-foreground",
          success: "group-[.toaster]:dy-border-emerald-500/20 group-[.toaster]:dy-bg-emerald-50 group-[.toaster]:dy-text-emerald-900",
          error: "group-[.toaster]:dy-border-red-500/20 group-[.toaster]:dy-bg-red-50 group-[.toaster]:dy-text-red-900",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
