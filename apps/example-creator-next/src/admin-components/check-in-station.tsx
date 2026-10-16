"use client";

import { useEffect, useState } from "react";
import {
  useAccess,
  useAdminClient,
  useAdminNavigate,
  useAdminNotify,
  usePageMeta,
  usePageRoute,
  type AdminPageProps,
} from "@dyrected/react";

interface Guest {
  id: string;
  name: string;
  guestCount?: number;
  tableNumber?: number;
  checkedIn?: boolean;
}

type Status = "idle" | "loading" | "error";

/**
 * A door check-in station: one search box, big result rows, one tap to check a
 * guest in. It is a page and not a view because it is a task, not a list of
 * records: it has no filters, columns or pagination to share with the admin.
 */
export function CheckInStation({ slug }: AdminPageProps) {
  const client = useAdminClient();
  const notify = useAdminNotify();
  const { can } = useAccess();
  const { navigate, to } = useAdminNavigate();
  const { searchParams, setSearchParams } = usePageRoute();

  // The search text lives in the URL, so a refresh or a shared link keeps it.
  const query = searchParams.get("q") ?? "";
  const [guests, setGuests] = useState<Guest[]>([]);
  const [status, setStatus] = useState<Status>("idle");

  usePageMeta({
    title: "Check-in station",
    description: "Find a guest and check them in at the door.",
    actions: [
      {
        label: "Open full roster",
        variant: "outline",
        onClick: () => navigate(to.workspace("door-checkin")),
      },
    ],
  });

  useEffect(() => {
    if (query.trim().length < 2) {
      setGuests([]);
      setStatus("idle");
      return;
    }

    // Ignore answers to searches the editor has already typed past.
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const result = await client
          .collection("guest-responses")
          .find({ search: query.trim(), where: { attending: { equals: true } }, limit: 8 });
        if (!cancelled) {
          // With generated types (`npx dyrected generate:types`) this cast is not needed.
          setGuests(result.docs as unknown as Guest[]);
          setStatus("idle");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [client, query]);

  async function checkIn(guest: Guest) {
    try {
      await client.collection("guest-responses").update(guest.id, { checkedIn: true });
      setGuests((current) => current.map((g) => (g.id === guest.id ? { ...g, checkedIn: true } : g)));
      notify.success(`${guest.name} is checked in`, {
        description: guest.tableNumber ? `Table ${guest.tableNumber}` : "No table assigned yet",
      });
    } catch (error) {
      notify.error(`Could not check in ${guest.name}`, {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

  return (
    <div data-page={slug} className="mx-auto flex max-w-2xl flex-col gap-4">
      <input
        autoFocus
        type="search"
        value={query}
        onChange={(event) =>
          setSearchParams(event.target.value ? { q: event.target.value } : {}, { replace: true })
        }
        placeholder="Start typing a guest's name…"
        aria-label="Search guests"
        className="h-12 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 text-lg"
      />

      {status === "error" ? (
        <p role="alert" className="text-sm text-[hsl(var(--muted-foreground))]">
          Could not search just now. Check your connection and keep typing to try again.
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {guests.map((guest) => (
          <li
            key={guest.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3"
          >
            <div>
              <p className="font-medium">{guest.name}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {guest.guestCount ?? 1} {(guest.guestCount ?? 1) === 1 ? "person" : "people"}
                {guest.tableNumber ? ` · Table ${guest.tableNumber}` : ""}
              </p>
            </div>
            {guest.checkedIn ? (
              <span className="text-sm font-medium">Checked in</span>
            ) : (
              <button
                type="button"
                disabled={!can("update", "guest-responses")}
                onClick={() => void checkIn(guest)}
                className="h-10 rounded-md bg-[hsl(var(--primary))] px-4 text-sm font-medium text-[hsl(var(--primary-foreground))] disabled:opacity-50"
              >
                Check in
              </button>
            )}
          </li>
        ))}
      </ul>

      {query.trim().length >= 2 && status === "idle" && guests.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">No attending guest matches “{query}”.</p>
      ) : null}
    </div>
  );
}
