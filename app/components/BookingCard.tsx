import { useFetcher } from "react-router";
import type { ProjectType } from "~/lib/phases";

export interface Booking {
  id: string;
  name: string;
  email: string;
  projectType: ProjectType;
  notes: string;
  bookedDate: string;
  bookedSlot: string;
  createdAt: string;
}

interface Props {
  booking: Booking;
}

export function BookingCard({ booking }: Props) {
  const fetcher = useFetcher();

  const isAccepting = fetcher.formData?.get("intent") === "accept-booking";
  const isDeclining = fetcher.formData?.get("intent") === "decline-booking";
  const isActing = isAccepting || isDeclining;

  if (isAccepting && fetcher.state === "idle" && fetcher.data) return null;
  if (isDeclining && fetcher.state === "idle" && fetcher.data) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm text-foreground truncate leading-snug">{booking.name}</p>
          <a
            href={`mailto:${booking.email}`}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors truncate block mt-0.5"
          >
            {booking.email}
          </a>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-blue-500/40 bg-blue-500/10 text-blue-400">
          Pending
        </span>
      </div>

      {/* Slot */}
      <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">
        <span>📅</span>
        <span>{booking.bookedDate} · {booking.bookedSlot} CET</span>
      </div>

      {/* Service + notes */}
      {booking.projectType && booking.projectType !== "website" && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{booking.projectType}</p>
      )}
      {booking.notes && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{booking.notes}</p>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-blue-500/20">
        <fetcher.Form method="post" className="flex-1">
          <input type="hidden" name="intent" value="accept-booking" />
          <input type="hidden" name="bookingId" value={booking.id} />
          <button
            type="submit"
            disabled={isActing}
            className="w-full text-xs px-2 py-1.5 rounded-md bg-green-600 text-white font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            {isAccepting ? "Accepting…" : "✓ Accept"}
          </button>
        </fetcher.Form>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="decline-booking" />
          <input type="hidden" name="bookingId" value={booking.id} />
          <button
            type="submit"
            disabled={isActing}
            className="text-xs px-2 py-1.5 rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer disabled:opacity-50"
            title="Decline booking"
          >
            {isDeclining ? "…" : "✕"}
          </button>
        </fetcher.Form>
      </div>
    </div>
  );
}
