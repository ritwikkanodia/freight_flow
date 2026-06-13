import { LoadStatus } from "@/lib/loads";

const STYLES: Record<LoadStatus, string> = {
  Created: "bg-gray-100 text-gray-700",
  Published: "bg-blue-100 text-blue-700",
  Booked: "bg-violet-100 text-violet-700",
  "At Pickup": "bg-amber-100 text-amber-700",
  Enroute: "bg-sky-100 text-sky-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-600",
};

export function StatusBadge({ status }: { status: LoadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}
