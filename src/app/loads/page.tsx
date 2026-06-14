import Link from "next/link";
import { fetchLoads, margin, formatUSD } from "@/lib/loads";
import { StatusBadge } from "@/components/StatusBadge";

export default async function LoadsPage() {
  const loads = await fetchLoads();
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Loads</h1>
          <p className="mt-1 text-sm text-gray-500">{loads.length} loads</p>
        </div>
        <button className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600">
          Create Load
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Load No. / Customer Load No.</th>
              <th className="px-4 py-3">Pickup</th>
              <th className="px-4 py-3">Drop-off</th>
              <th className="px-4 py-3">Carrier / Driver</th>
              <th className="px-4 py-3 text-right">Customer Rate</th>
              <th className="px-4 py-3 text-right">Carrier Rate / Margin</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loads.map((load) => {
              const m = margin(load);
              return (
                <tr key={load.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/loads/${load.id}`}
                      className="font-medium text-gray-900 hover:text-orange-600"
                    >
                      {load.loadNo}
                      {load.customerLoadNo ? ` | ${load.customerLoadNo}` : ""}
                    </Link>
                    <div className="text-xs text-gray-500">{load.customer}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-gray-900">
                      {load.pickup.city}, {load.pickup.state}
                    </div>
                    <div className="text-xs text-gray-500">{load.pickup.dateTime}</div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="text-gray-900">
                      {load.dropoff.city}, {load.dropoff.state}
                    </div>
                    <div className="text-xs text-gray-500">{load.dropoff.dateTime}</div>
                  </td>

                  <td className="px-4 py-3">
                    {load.carrier ? (
                      <>
                        <div className="text-gray-900">{load.carrier}</div>
                        {load.driver && (
                          <div className="text-xs text-gray-500">{load.driver.name}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatUSD(load.customerRate)}
                  </td>

                  <td className="px-4 py-3 text-right">
                    {load.carrierRate != null ? (
                      <>
                        <div className="text-gray-900">{formatUSD(load.carrierRate)}</div>
                        {m && (
                          <div className="text-xs font-medium text-green-600">
                            +{formatUSD(m.amount)} ({m.pct.toFixed(2)}%)
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-400">Load not published</span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={load.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
