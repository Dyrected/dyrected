import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../providers/dyrected-provider"
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
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"

interface RelationshipPickerProps {
  value?: string
  onChange: (value: string) => void
  label?: string
  relationTo: string // The collection slug this field relates to
}

export function RelationshipPicker({ value, onChange, label, relationTo }: RelationshipPickerProps) {
  const { client } = useDyrected()
  const [open, setOpen] = React.useState(false)

  // Fetch the related collection documents
  const { data, isLoading } = useQuery({
    queryKey: ["collection", relationTo, "list"],
    queryFn: () => client!.collection(relationTo).find({ limit: 100 }).then(res => res.docs),
    enabled: !!client && !!relationTo,
  })

  // Determine a display label for an item. 
  // We'll fallback to ID if no title or name exists.
  const getDisplayLabel = (item: any) => {
    return item.title || item.name || item.slug || item.id
  }

  const selectedItem = value ? data?.find((item) => item.id === value) : null

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-sm font-medium leading-none">{label}</label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {isLoading ? (
              "Loading..."
            ) : selectedItem ? (
              getDisplayLabel(selectedItem)
            ) : (
              <span className="text-muted-foreground">Select {relationTo}...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${relationTo}...`} />
            <CommandList>
              <CommandEmpty>No item found.</CommandEmpty>
              <CommandGroup>
                {data?.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={getDisplayLabel(item)}
                    onSelect={() => {
                      onChange(item.id === value ? "" : item.id)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === item.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getDisplayLabel(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
