import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "../../components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../components/ui/popover"
import { Badge } from "../../components/ui/badge"

interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  value?: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  label,
  placeholder = "Select options...",
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (currentValue: string) => {
    const isSelected = value.includes(currentValue)
    if (isSelected) {
      onChange(value.filter((val) => val !== currentValue))
    } else {
      onChange([...value, currentValue])
    }
  }

  const handleRemove = (valueToRemove: string) => {
    onChange(value.filter((val) => val !== valueToRemove))
  }

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-auto min-h-10 font-normal"
          >
            <div className="flex flex-wrap gap-1 items-center">
              {value.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {value.map((val) => {
                const option = options.find((opt) => opt.value === val)
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="mr-1 mb-1 items-center gap-1"
                  >
                    {option?.label || val}
                    {!disabled && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRemove(val)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={() => handleRemove(val)}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </div>
                    )}
                  </Badge>
                )
              })}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = value.includes(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
