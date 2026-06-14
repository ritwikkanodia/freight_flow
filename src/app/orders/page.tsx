import Link from "next/link";
import { fetchLoad, fetchLoads, formatUSD } from "@/lib/loads";
import { getSupplierOrdersForLoads } from "@/lib/supplierOrders.mjs";

export default async function OrdersPage() {
  const loadSummaries = await fetchLoads();
  const loads = (
    await Promise.all(loadSummaries.map((load) => fetchLoad(load.id)))
  ).filter((load) => load != null);
  const orders = getSupplierOrdersForLoads(loads);

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Supplier Orders</h1>
        <p className="mt-1 text-sm text-gray-500">
          Click an order row to review supplier shipment, SKU, and tender details.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Order / Supplier</th>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Dispatch</th>
              <th className="px-4 py-3 text-right">Order Value</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orders.map((order) => (
              <tr className="group hover:bg-orange-50/40" key={order.id}>
                <td className="px-4 py-3">
                  <Link className="block" href={`/orders/${encodeURIComponent(order.id)}`}>
                    <div className="font-semibold text-gray-900 group-hover:text-orange-700">{order.id}</div>
                    <div className="text-xs text-gray-500">{order.supplierName}</div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link className="block" href={`/orders/${encodeURIComponent(order.id)}`}>
                    <div className="text-gray-900">{order.shipment.commodityType}</div>
                    <div className="text-xs text-gray-500">
                      {order.shipment.palletCount} pallets · {order.shipment.weightLbs.toLocaleString()} lbs
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link className="block" href={`/orders/${encodeURIComponent(order.id)}`}>
                    <div className="text-gray-900">{order.dispatch.place}</div>
                    <div className="text-xs text-gray-500">{order.dispatch.time}</div>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  <Link className="block" href={`/orders/${encodeURIComponent(order.id)}`}>
                    {formatUSD(order.order.totalPrice)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link className="block" href={`/orders/${encodeURIComponent(order.id)}`}>
                    <SupplierStatusBadge status={order.status} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function SupplierStatusBadge({ status }: { status: string }) {
  const styles =
    status === "accepted"
      ? "bg-green-100 text-green-700 ring-green-200"
      : status === "rejected"
        ? "bg-red-100 text-red-700 ring-red-200"
        : "bg-amber-100 text-amber-700 ring-amber-200";
  const label = status === "order received" ? "Order received" : status;

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${styles}`}>
      {label}
    </span>
  );
}
