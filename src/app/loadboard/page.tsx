import { fetchLoadBoard, formatUSD } from "@/lib/loads";
import { getCarrierBidsForBoardItems, groupCarrierBidsByLoad } from "@/lib/carrierBids.mjs";
import Link from "next/link";

export default async function LoadBoardPage() {
  const items = await fetchLoadBoard();
  const bids = getCarrierBidsForBoardItems(items);
  const bidGroups = groupCarrierBidsByLoad(bids);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Carrier Bids</h1>
        <p className="mt-1 text-sm text-gray-500">
          {bids.length} inbound offer{bids.length === 1 ? "" : "s"} across {bidGroups.length} load{bidGroups.length === 1 ? "" : "s"}
        </p>
      </div>

      {bids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
          No carrier bids are available yet.
        </div>
      ) : (
        <div className="space-y-4">
          {bidGroups.map((group) => (
            <LoadBidGroup group={group} key={group.loadId} />
          ))}
        </div>
      )}
    </main>
  );
}

function LoadBidGroup({ group }: { group: ReturnType<typeof groupCarrierBidsByLoad>[number] }) {
  const recommended = group.bids.find((bid) => bid.status === "recommended");
  const bestBid = group.bids.reduce((lowest, bid) => bid.bidAmount < lowest.bidAmount ? bid : lowest, group.bids[0]);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">
              {group.sourceBoards.join(", ")} · {group.bids.length} bid{group.bids.length === 1 ? "" : "s"}
            </div>
            <Link className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-orange-700" href={group.loadHref}>
              Load {group.loadNo}
              <span aria-hidden className="text-sm text-orange-600">→</span>
            </Link>
            <p className="mt-1 text-sm text-gray-500">
              {group.pickup.city}, {group.pickup.state} to {group.dropoff.city}, {group.dropoff.state} · {group.distanceMiles.toLocaleString()} mi · {group.driverType} {group.equipment}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-gray-500">Best bid</div>
            <div className="text-lg font-semibold text-gray-900">{formatUSD(bestBid.bidAmount)}</div>
            {recommended && (
              <div className="text-xs font-medium text-green-700">Recommended: {recommended.carrierName}</div>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {group.bids.map((bid) => (
          <BidCard key={`${bid.loadId}-${bid.carrierName}-${bid.bidAmount}`} bid={bid} />
        ))}
      </div>
    </section>
  );
}

function BidCard({ bid }: { bid: ReturnType<typeof getCarrierBidsForBoardItems>[number] }) {
  return (
    <article className="p-5">
      <div className="grid gap-5 lg:grid-cols-[1fr_220px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                {bid.sourceBoard} ref {bid.referenceNo}
              </div>
              <h2 className="mt-1 text-lg font-semibold text-gray-900">{bid.carrierName}</h2>
              <p className="mt-1 text-sm text-gray-500">{bid.notes}</p>
            </div>
            <BidStatus status={bid.status} />
          </div>

          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Info label="Pickup" value={`${bid.pickup.city}, ${bid.pickup.state}`} detail={bid.pickup.dateTime} />
            <Info label="Drop-off" value={`${bid.dropoff.city}, ${bid.dropoff.state}`} detail={bid.dropoff.dateTime} />
            <Info label="Equipment" value={`${bid.driverType} · ${bid.equipment}`} detail={`${bid.distanceMiles.toLocaleString()} mi`} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Bid</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{formatUSD(bid.bidAmount)}</div>
          {bid.postedRate != null && (
            <div className="mt-1 text-xs text-gray-500">
              Posted target {formatUSD(bid.postedRate)}
              {bid.marginToPosted != null && (
                <span className="ml-1 font-medium text-green-700">
                  ({bid.marginToPosted >= 0 ? "+" : ""}
                  {formatUSD(bid.marginToPosted)})
                </span>
              )}
            </div>
          )}
          <div className="mt-4 border-t border-gray-200 pt-3 text-sm">
            <div className="font-medium text-gray-900">{bid.contactName}</div>
            <a className="text-gray-600 hover:text-orange-700" href={`tel:${bid.contactPhone}`}>
              {bid.contactPhone}
            </a>
            <div className="mt-2 text-xs text-gray-500">Submitted {bid.submittedAt}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-900">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{detail}</div>
    </div>
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
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}>
      {status}
    </span>
  );
}
