"use client";

import { useState } from "react";
import { useCollectionView, useGroupedDocuments, useViewActions } from "@dyrected/react";

/*
 * Styling: the admin themes itself with CSS variables that hold bare HSL values
 * (`--card`, `--border`, `--muted`, …) and switches them for light and dark, so
 * `bg-[hsl(var(--card))]` follows the admin's theme automatically. The site's own
 * `dark:` variant does not: it tracks `<html class="dark">`, which this site always sets.
 */

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

  // Check In and Undo Check-In are mirror images: offer whichever applies to the guest.
  const actionsFor = (guest: Record<string, any>) =>
    rowActions.filter((action) =>
      action.name === "checkIn" ? !guest.checkedIn : action.name === "undoCheckIn" ? Boolean(guest.checkedIn) : true,
    );

  if (!columns.length) {
    return (
      <p className="rounded-xl border border-[hsl(var(--border))] p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
        No guests match these filters.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 text-[hsl(var(--foreground))]">
      {columns.map((column) => {
        // Each record is one RSVP, and `guestCount` is how many people it covers
        // (the guest plus their plus-ones), so people can outnumber the names listed.
        const people = column.docs.reduce((sum, guest) => sum + Number(guest.guestCount ?? 1), 0);
        return (
          <section
            key={column.key}
            data-testid={`table-${column.key}`}
            className="flex flex-col gap-3 rounded-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-3 text-[hsl(var(--card-foreground))] shadow-sm"
          >
            <header className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <span className="rounded-full bg-[hsl(var(--muted))] px-2 py-0.5 text-xs font-medium tabular-nums text-[hsl(var(--muted-foreground))]">
                {column.docs.length} {column.docs.length === 1 ? "RSVP" : "RSVPs"} · {people}{" "}
                {people === 1 ? "person" : "people"}
              </span>
            </header>

            <ul className="flex flex-col gap-2">
              {column.docs.map((guest) => (
                <li
                  key={guest.id}
                  className={`flex flex-col gap-2 rounded-lg bg-[hsl(var(--muted)/0.5)] p-2.5 transition-opacity ${
                    savingId === guest.id ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => open(String(guest.id), "drawer")}
                      className="truncate text-left text-sm font-medium hover:underline"
                    >
                      {guest.name}
                      {Number(guest.guestCount ?? 1) > 1 ? (
                        <span className="ml-1.5 text-xs font-normal text-[hsl(var(--muted-foreground))]">
                          +{Number(guest.guestCount) - 1}
                        </span>
                      ) : null}
                    </button>
                    {guest.checkedIn ? (
                      <span className="shrink-0 rounded-full bg-[hsl(var(--primary)/0.2)] px-2 py-0.5 text-[11px] font-medium">
                        Checked in
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {permissions.canUpdate ? (
                      <select
                        aria-label={`Move ${guest.name} to a table`}
                        value={column.key === "__none" ? "" : column.key}
                        onChange={(event) => void moveGuest(String(guest.id), event.target.value)}
                        className="h-7 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-1.5 text-xs"
                      >
                        <option value="">Not seated</option>
                        {tableNumbers.map((table) => (
                          <option key={table} value={table}>
                            Table {table}
                          </option>
                        ))}
                      </select>
                    ) : null}

                    {actionsFor(guest).map((action) => (
                      <button
                        key={action.name}
                        type="button"
                        disabled={isRunning(action.name, [guest])}
                        // Opens Dyrected's own confirm dialog and input form when the action needs them.
                        onClick={() => void run(action.name, [guest])}
                        className="h-7 rounded-md bg-[hsl(var(--background))] border border-[hsl(var(--border))] px-2 text-xs font-medium hover:bg-[hsl(var(--muted))] disabled:opacity-50"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Extension slot registered on the view (`beforeViewContent`). It shows that
 * slots now read the same documents as the layout on screen.
 */
export function GuestHeadcountBanner() {
  const { documents, total, isFetching } = useCollectionView();
  const people = documents.reduce((sum, guest) => sum + Number(guest.guestCount ?? 1), 0);

  return (
    <p className="text-sm text-[hsl(var(--muted-foreground))]" aria-live="polite">
      {isFetching ? "Updating…" : `${documents.length} of ${total} RSVPs loaded, covering ${people} people.`}
    </p>
  );
}
