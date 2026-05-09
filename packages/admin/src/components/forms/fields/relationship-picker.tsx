import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { Button } from "../../ui/button"
import { Badge } from "../../ui/badge"
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
import { Check, ChevronsUpDown } from "lucide-react"
import { cn, getMediaUrl } from "../../../lib/utils"

interface RelationshipPickerProps {
  value?: string | string[]
  onChange: (value: string | string[]) => void
  label?: string
  relationTo: string // The collection slug this field relates to
  multiple?: boolean
  disabled?: boolean
}

export function RelationshipPicker({ value, onChange, label, relationTo, multiple, disabled }: RelationshipPickerProps) {
  const { client, schemas } = useDyrected()
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const relatedCollection = schemas?.collections.find((c: any) => c.slug === relationTo)
  if (!relationTo) console.warn("[RelationshipPicker] No relationTo/collection defined for field:", label)
  const isUpload = !!relatedCollection?.upload
  const displayField = relatedCollection?.admin?.useAsTitle || "title"

  // Fetch the related collection documents
  const { data, isLoading } = useQuery({
    queryKey: ["collection", relationTo, "picker", search],
    queryFn: () => {
      let qb = client!.collection(relationTo).find({ limit: 20 })
      if (search) {
        qb = qb.where({ [displayField]: { like: `%${search}%` } })
      }
      return qb.exec().then((res: any) => res.docs)
    },
    enabled: !!client && !!relationTo,
  })

  // Determine a display label for an item. 
  // We'll fallback to ID if no title or name exists.
  const getDisplayLabel = (item: any) => {
    return item[displayField] || item.name || item.slug || item.id
  }

  const values = Array.isArray(value) ? value : value ? [value] : []
  const selectedItems = values.map(v => data?.find((item: any) => item.id === v)).filter(Boolean)

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
            className="w-full justify-between font-normal"
          >
            {isLoading ? (
              "Loading..."
            ) : selectedItems.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {selectedItems.map((item: any) => (
                  <Badge key={item.id} variant="secondary" className="text-[10px] h-5 px-1.5">
                    {getDisplayLabel(item)}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Select {relationTo}...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder={`Search ${relationTo}...`} 
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{isLoading ? "Searching..." : "No item found."}</CommandEmpty>
              <CommandGroup>
                {data?.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => {
                      if (multiple) {
                        const newValues = values.includes(item.id)
                          ? values.filter(v => v !== item.id)
                          : [...values, item.id]
                        onChange(newValues)
                      } else {
                        onChange(item.id === value ? "" : item.id)
                        setOpen(false)
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isUpload && (
                        <div className="h-6 w-6 rounded border bg-muted overflow-hidden flex-shrink-0">
                          <img 
                            src={getMediaUrl(item, client?.getBaseUrl() || "")} 
                            className="h-full w-full object-cover" 
                            alt="" 
                          />
                        </div>
                      )}
                      <span className="flex-1">{getDisplayLabel(item)}</span>
                      <Check
                        className={cn(
                          "h-4 w-4",
                          values.includes(item.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
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
