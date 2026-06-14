import { notFound } from "next/navigation";
import { fetchLoad, fetchLoadBoard, margin, formatUSD } from "@/lib/loads";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadPostings } from "@/components/LoadPostings";
import { SimulatedTrackingPanel } from "@/components/SimulatedTrackingPanel";
import { getCarrierBidGroupForLoad, getCarrierBidsForBoardItems } from "@/lib/carrierBids.mjs";

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const load = await fetchLoad(id);
  if (!load) notFound();
  const boardItems = await fetchLoadBoard();
  const bidGroup = getCarrierBidGroupForLoad(getCarrierBidsForBoardItems(boardItems), load.id);

  const m = margin(load);
  const ratePerMile = (rate: number) => `$${(rate / load.distanceMiles).toFixed(2)} / mi`;
  const doneTasks = load.tasks.filter((t) => t.status === "Done").length;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-2">
          <Field label="Load No." value={load.loadNo} big />
          <Field label="Customer Load No." value={load.customerLoadNo ?? "—"} big />
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
            <div className="mt-1">
              <StatusBadge status={load.status} />
            </div>
          </div>
          <div className="ml-auto text-sm text-gray-500">{load.customer}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <SimulatedTrackingPanel load={load} />

          <Card title="Load Info">
            <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              <Info label="Distance" value={`${load.distanceMiles.toLocaleString()} miles`} />
              <Info label="Equipment" value={load.equipment} />
              <Info label="Load Size" value={load.loadSize} />
              <Info label="Driver Type" value={load.driverType} />
              <Info label="Weight" value={`${load.weightLbs.toLocaleString()} lbs`} />
              <Info label="Cargo Value" value={load.cargoValue} />
              {load.temperatureMode && <Info label="Temperature Mode" value={load.temperatureMode} />}
              {load.temperatureF != null && <Info label="Temperature" value={`${load.temperatureF} °F`} />}
            </dl>
          </Card>

          {load.postings && load.postings.length > 0 && (
            <LoadPostings postings={load.postings} loadId={load.id} />
          )}

          <LoadBidsCard bidGroup={bidGroup} />

          <Card title={`Tasks (${doneTasks}/${load.tasks.length})`}>
            <ul className="divide-y divide-gray-100">
              {load.tasks.map((t) => (
                <li key={t.label} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-800">{t.label}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.status === "Done"
                        ? "bg-green-100 text-green-700"
                        : t.status === "In Progress"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card title="Charges">
            <ChargeRow label="Customer Rate" total={load.customerRate} perMile={ratePerMile(load.customerRate)} />
            {load.carrierRate != null ? (
              <ChargeRow label="Carrier Rate" total={load.carrierRate} perMile={ratePerMile(load.carrierRate)} />
            ) : (
              <div className="py-3 text-sm text-gray-400">Carrier not yet booked</div>
            )}
            {m && (
              <div className="mt-3 rounded-md bg-green-50 px-3 py-2">
                <div className="text-xs uppercase tracking-wide text-green-700">Margin</div>
                <div className="text-lg font-semibold text-green-700">
                  +{formatUSD(m.amount)}{" "}
                  <span className="text-sm font-medium">({m.pct.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Driver Info">
            {load.driver ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name</span>
                  <span className="font-medium text-gray-900">{load.driver.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Carrier</span>
                  <span className="font-medium text-gray-900">{load.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phone</span>
                  <span className="font-medium text-gray-900">{load.driver.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rating</span>
                  <span className="text-amber-500">
                    {"★".repeat(load.driver.rating)}
                    <span className="text-gray-300">{"★".repeat(5 - load.driver.rating)}</span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No driver assigned</p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

function LoadBidsCard({
  bidGroup,
}: {
  bidGroup: ReturnType<typeof getCarrierBidGroupForLoad>;
}) {
  if (!bidGroup) {
    return (
      <Card title="Carrier Bids">
        <p className="text-sm text-gray-400">No carrier bids received for this load yet.</p>
      </Card>
    );
  }

  const bestBid = bidGroup.bids.reduce((lowest, bid) => bid.bidAmount < lowest.bidAmount ? bid : lowest, bidGroup.bids[0]);

  return (
    <Card title={`Carrier Bids (${bidGroup.bids.length})`}>
      <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Best bid</div>
            <div className="mt-0.5 text-sm font-semibold text-gray-900">
              {bestBid.carrierName} · {formatUSD(bestBid.bidAmount)}
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Source: {bidGroup.sourceBoards.join(", ")}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {bidGroup.bids.map((bid) => (
          <div className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]" key={`${bid.carrierName}-${bid.bidAmount}`}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">{bid.carrierName}</div>
                <BidStatus status={bid.status} />
              </div>
              <p className="mt-1 text-xs leading-5 text-gray-500">{bid.notes}</p>
              <div className="mt-2 text-xs text-gray-500">
                {bid.contactName} · {bid.contactPhone} · {bid.submittedAt}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm font-semibold text-gray-900">{formatUSD(bid.bidAmount)}</div>
              {bid.marginToPosted != null && (
                <div className="text-xs text-green-700">
                  {bid.marginToPosted >= 0 ? "+" : ""}
                  {formatUSD(bid.marginToPosted)} vs posted
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BidStatus({ status }: { status: string }) {
  const styles =
    status === "recommended"
      ? "bg-green-100 text-green-700 ring-green-200"
      : status === "rejected"
        ? "bg-red-100 text-red-700 ring-red-200"
        : "bg-amber-100 text-amber-700 ring-amber-200";

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ${styles}`}>
      {status}
    </span>
  );
}

function Field({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-gray-900 ${big ? "text-xl font-semibold" : ""}`}>{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function ChargeRow({ label, total, perMile }: { label: string; total: number; perMile: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <div className="font-medium text-gray-900">{formatUSD(total)}</div>
        <div className="text-xs text-gray-400">{perMile}</div>
      </div>
    </div>
  );
}
