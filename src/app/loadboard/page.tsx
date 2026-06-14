import { fetchLoadBoard, LoadBoardItem } from "@/lib/loads";
import { InterestForm } from "@/components/InterestForm";

const PARTNER_STYLES: Record<LoadBoardItem["partner"], { bg: string; abbr: string }> = {
  "Trucker Path": { bg: "bg-blue-600", abbr: "TP" },
  DAT: { bg: "bg-indigo-600", abbr: "D" },
  Truckstop: { bg: "bg-emerald-600", abbr: "TS" },
};

export default async function LoadBoardPage() {
  const items = await fetchLoadBoard();

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Load Board</h1>
        <p className="mt-1 text-sm text-gray-500">
          {items.length} available load{items.length === 1 ? "" : "s"} · find your next haul
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
          No loads are posted right now. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <BoardCard key={`${item.loadId}-${item.referenceNo}`} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}

function BoardCard({ item }: { item: LoadBoardItem }) {
  const partner = PARTNER_STYLES[item.partner];

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header: partner + load id */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${partner.bg}`}
            title={item.partner}
          >
            {partner.abbr}
          </span>
          <div>
            <div className="text-xs font-medium text-gray-500">{item.partner}</div>
            <div className="text-xs text-gray-400">Ref #{item.referenceNo}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-gray-400">Load ID</div>
          <div className="text-lg font-semibold text-gray-900">{item.loadId}</div>
        </div>
      </div>

      {/* Route */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 p-5">
        <Stop city={item.pickup.city} state={item.pickup.state} when={item.pickup.dateTime} />
        <span className="text-gray-300" aria-hidden>
          →
        </span>
        <Stop
          city={item.dropoff.city}
          state={item.dropoff.state}
          when={item.dropoff.dateTime}
          align="right"
        />
      </div>

      {/* Freight details — reserve two rows so cards stay aligned */}
      <div className="flex min-h-[3.75rem] flex-wrap content-start gap-2 px-5 pb-4">
        <Tag>{item.equipment}</Tag>
        <Tag>{item.distanceMiles.toLocaleString()} mi</Tag>
        <Tag>{item.weightLbs.toLocaleString()} lbs</Tag>
        <Tag>{item.driverType}</Tag>
        {item.temperatureF != null && <Tag>{item.temperatureF} °F</Tag>}
      </div>

      {item.comments && (
        <p className="line-clamp-1 px-5 pb-4 text-xs text-gray-500">{item.comments}</p>
      )}

      {/* Contact / CTA */}
      <div className="mt-auto border-t border-gray-100 p-5">
        {item.agent ? (
          <div className="mb-3 text-sm">
            <div className="font-medium text-gray-900">{item.agent.name}</div>
            <a href={`tel:${item.agent.phone}`} className="block text-gray-600 hover:text-orange-600">
              {item.agent.phone}
            </a>
            <a
              href={`mailto:${item.agent.email}`}
              className="block text-gray-600 hover:text-orange-600"
            >
              {item.agent.email}
            </a>
          </div>
        ) : (
          <p className="mb-3 text-sm text-gray-400">Contact broker for details</p>
        )}
        <InterestForm loadId={item.loadId} />
      </div>
    </div>
  );
}

function Stop({
  city,
  state,
  when,
  align,
}: {
  city: string;
  state: string;
  when: string;
  align?: "right";
}) {
  return (
    <div className={`min-w-0 ${align === "right" ? "text-right" : ""}`}>
      <div className="truncate text-base font-semibold text-gray-900">
        {city}, {state}
      </div>
      <div className="truncate text-xs text-gray-500">{when}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}
