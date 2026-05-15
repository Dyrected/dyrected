import { useQuery } from "@tanstack/react-query"
import { useDyrected } from "../../../providers/dyrected-provider"
import { useNavigate, useParams } from "react-router-dom"
import { ExternalLink, FileText, Plus } from "lucide-react"
import { Button } from "../../ui/button"

interface JoinFieldProps {
  schema: any
}

export function JoinField({ schema }: JoinFieldProps) {
  const { client, schemas } = useDyrected()
  const { id: docId } = useParams()
  const navigate = useNavigate()

  const targetCollection: string = schema.collection
  const onField: string = schema.on

  const targetSchema = schemas?.collections?.find((c: any) => c.slug === targetCollection)
  const displayField: string = targetSchema?.admin?.useAsTitle || "title"

  const { data, isLoading } = useQuery({
    queryKey: ["join", targetCollection, onField, docId],
    queryFn: () =>
      client!
        .collection(targetCollection)
        .find()
        .where({ [onField]: { equals: docId } })
        .exec()
        .then((res: any) => res.docs),
    enabled: !!client && !!docId && !!targetCollection && !!onField,
  })

  const getLabel = (item: any) =>
    item[displayField] || item.name || item.slug || item.id

  if (!docId) {
    return (
      <p className="dy-text-xs dy-text-muted-foreground/60 dy-italic dy-py-2">
        Save this document first to view related {targetCollection}.
      </p>
    )
  }

  return (
    <div className="dy-space-y-3">
      {isLoading ? (
        <div className="dy-rounded-xl dy-border dy-border-border/40 dy-bg-muted/5 dy-px-4 dy-py-3">
          <p className="dy-text-xs dy-text-muted-foreground/60">Loading...</p>
        </div>
      ) : data && data.length > 0 ? (
        <div className="dy-divide-y dy-divide-border/30 dy-rounded-xl dy-border dy-border-border/40 dy-overflow-hidden">
          {data.map((item: any) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/collections/${targetCollection}/edit/${item.id}`)}
              className="dy-flex dy-items-center dy-justify-between dy-w-full dy-px-4 dy-py-3 dy-text-sm hover:dy-bg-muted/30 dy-transition-colors dy-text-left dy-group"
            >
              <div className="dy-flex dy-items-center dy-gap-3">
                <FileText className="dy-h-3.5 dy-w-3.5 dy-text-muted-foreground/40 dy-shrink-0" />
                <span className="dy-text-foreground/80 dy-font-medium dy-truncate">{getLabel(item)}</span>
              </div>
              <ExternalLink className="dy-h-3 dy-w-3 dy-text-muted-foreground/30 dy-opacity-0 dy-group-hover:dy-opacity-100 dy-transition-opacity dy-shrink-0 dy-ml-2" />
            </button>
          ))}
        </div>
      ) : (
        <div className="dy-rounded-xl dy-border dy-border-dashed dy-border-border/40 dy-bg-muted/5 dy-px-4 dy-py-6 dy-text-center">
          <p className="dy-text-xs dy-text-muted-foreground/60 dy-italic">
            No related {targetSchema?.labels?.plural || targetCollection} found.
          </p>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="dy-h-8 dy-text-[11px] dy-font-bold dy-rounded-xl dy-border-primary/20 hover:dy-bg-primary/5 hover:dy-text-primary dy-transition-all dy-shadow-sm"
        onClick={() => navigate(`/collections/${targetCollection}/create?${onField}=${docId}`)}
      >
        <Plus className="dy-w-3 dy-h-3 dy-mr-1.5" />
        Create new {targetSchema?.labels?.singular || targetCollection}
      </Button>
    </div>
  )
}
