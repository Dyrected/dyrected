import { Outlet, useParams } from "react-router-dom"
import { useDyrected } from "../../providers/dyrected-context"
import { canReadSchema } from "../../utils/schema-access"
import { AdminNotFound } from "../layout/admin-not-found"

/**
 * Layout route that blocks direct URLs to a collection or global the current
 * user cannot read, so hidden navigation entries cannot be reached by typing
 * the address. Unknown slugs fall through to each page's own not-found state.
 */
export function ReadAccessGuard({ kind }: { kind: "collections" | "globals" }) {
  const { slug } = useParams()
  const { schemas, user } = useDyrected()
  const schema = (schemas as any)?.[kind]?.find((s: any) => s.slug === slug)
  if (schema && !canReadSchema(schema, user)) {
    return (
      <AdminNotFound
        title="You don't have access to this"
        description="Your role doesn't include permission to view this area. If you think that's a mistake, ask an administrator to update your access."
      />
    )
  }
  return <Outlet />
}
