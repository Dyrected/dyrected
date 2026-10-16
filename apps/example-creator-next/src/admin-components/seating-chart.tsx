"use client";

import { useState } from "react";
import { useCollectionView, useGroupedDocuments, useViewActions } from "@dyrected/react";

/**
 * Custom view layout for `guest-responses`: guests grouped by table.
 *
 * Dyrected owns the header, KPI cards, search, filters, pagination and the
 * action dialogs. This component only draws documents, and reads and changes
 * everything through the same hooks any custom layout gets.
 */
export function SeatingChart() {
  const { permissions, updateDocument, open, config } = useCollectionView();
  const { actions, run, isRunning } = useViewActions();
  const tableField = (config.options?.tableField as string | undefined) ?? "tableNumber";
  const { groups, ungrouped } = useGroupedDocuments(tableField);
  const [savingId, setSavingId] = useState<string | null>(null);

  const tableNumbers = groups.map((group) => group.key);
  const rowActions = actions.filter((action) => (action.type ?? "row") === "row" && !action.operation);

  async function moveGuest(id: string, table: string) {
    setSavingId(id);
    try {
      // Shows the change straight away on every layout; rolls back if the server refuses it.
      await updateDocument(id, { [tableField]: table === "" ? null : Number(table) });
    } catch {
      // updateDocument already reported the failure with a toast.
    } finally {
      setSavingId(null);
    }
  }

  const columns = [
    ...groups.map((group) => ({ key: group.key, title: `Table ${group.label}`, docs: group.docs })),
    ...(ungrouped.length ? [{ key: "__none", title: "Not seated", docs: ungrouped }] : []),
  ];

  if (!columns.length) {
    return <p style={{ padding: 24, textAlign: "center", opacity: 0.7 }}>No guests match these filters.</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
      {columns.map((column) => (
        <section
          key={column.key}
          data-testid={`table-${column.key}`}
          style={{ border: "1px solid var(--border, #e5e7eb)", borderRadius: 12, padding: 12 }}
        >
          <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: 600 }}>
            <span>{column.title}</span>
            <span style={{ opacity: 0.6 }}>
              {column.docs.reduce((seats, guest) => seats + Number(guest.guestCount ?? 1), 0)} seats
            </span>
          </header>

          <ul style={{ display: "grid", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            {column.docs.map((guest) => (
              <li
                key={guest.id}
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 8,
                  borderRadius: 8,
                  background: "var(--muted, #f4f4f5)",
                  opacity: savingId === guest.id ? 0.6 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => open(String(guest.id), "drawer")}
                  style={{ textAlign: "left", fontWeight: 500, background: "none", border: 0, padding: 0, cursor: "pointer" }}
                >
                  {guest.name}
                  {guest.checkedIn ? " ✓" : ""}
                </button>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {permissions.canUpdate ? (
                    <select
                      aria-label={`Move ${guest.name} to a table`}
                      value={column.key === "__none" ? "" : column.key}
                      onChange={(event) => void moveGuest(String(guest.id), event.target.value)}
                    >
                      <option value="">Not seated</option>
                      {tableNumbers.map((table) => (
                        <option key={table} value={table}>
                          Table {table}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {rowActions.map((action) => (
                    <button
                      key={action.name}
                      type="button"
                      disabled={isRunning(action.name, [guest])}
                      // Opens Dyrected's own confirm dialog and input form when the action needs them.
                      onClick={() => void run(action.name, [guest])}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/**
 * Extension slot registered on the view (`beforeViewContent`). It shows that
 * slots now read the same documents as the layout on screen.
 */
export function GuestHeadcountBanner() {
  const { documents, total, isFetching } = useCollectionView();
  const seats = documents.reduce((sum, guest) => sum + Number(guest.guestCount ?? 1), 0);

  return (
    <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }} aria-live="polite">
      {isFetching ? "Updating…" : `${documents.length} of ${total} guests loaded, ${seats} seats.`}
    </p>
  );
}
