import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import { cn } from "../../../lib/utils"
import { Button } from "../../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../ui/popover"
import { Badge } from "../../ui/badge"

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

/**
 * MultiSelect Field component
 * 
 * Provides a tag-based multi-selection UI using a searchable dropdown.
 */
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
    <div className="dy-flex dy-flex-col dy-gap-2">
      {label && <label className="dy-text-sm dy-font-medium dy-leading-none">{label}</label>}
      <Popover open={disabled ? false : open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="dy-w-full dy-justify-between dy-h-auto dy-min-h-10 dy-font-normal"
          >
            <div className="dy-flex dy-flex-wrap dy-gap-1 dy-items-center">
              {value.length === 0 && (
                <span className="dy-text-muted-foreground">{placeholder}</span>
              )}
              {value.map((val) => {
                const option = options.find((opt) => opt.value === val)
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="dy-mr-1 dy-mb-1 dy-items-center dy-gap-1"
                  >
                    {option?.label || val}
                    {!disabled && (
                      <div
                        role="button"
                        tabIndex={0}
                        className="dy-ring-offset-background dy-rounded-full dy-outline-none focus:dy-ring-2 focus:dy-ring-ring focus:dy-ring-offset-2"
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
                        <X className="dy-h-3 dy-w-3 dy-text-muted-foreground hover:dy-text-foreground" />
                      </div>
                    )}
                  </Badge>
                )
              })}
            </div>
            <ChevronsUpDown className="dy-ml-2 dy-h-4 dy-w-4 dy-shrink-0 dy-opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="dy-w-[400px] dy-p-0" align="start">
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
                      value={option.label as any}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "dy-mr-2 dy-h-4 dy-w-4",
                          isSelected ? "dy-opacity-100" : "dy-opacity-0"
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
