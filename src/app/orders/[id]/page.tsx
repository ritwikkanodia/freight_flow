import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchLoad, fetchLoads, formatUSD } from "@/lib/loads";
import { buildLoadLifecycle } from "@/lib/loadLifecycle.mjs";
import { findSupplierOrderById, getSupplierOrderLoadHref } from "@/lib/supplierOrders.mjs";

export default async function SupplierOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loadSummaries = await fetchLoads();
  const loads = (
    await Promise.all(loadSummaries.map((load) => fetchLoad(load.id)))
  ).filter((load) => load != null);
  const order = findSupplierOrderById(loads, decodeURIComponent(id));
  if (!order) notFound();

  const load = loads.find((item) => item.id === order.loadId);
  if (!load) notFound();

  const lifecycle = buildLoadLifecycle(load);
  const currentStep = lifecycle.find((step) => step.state === "current") ?? lifecycle[lifecycle.length - 1];

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6">
        <Link className="text-sm text-gray-500 hover:text-orange-700" href="/orders">
          ← Back to orders
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">{order.id}</div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">{order.supplierName}</h1>
            <p className="mt-1 text-sm text-gray-500">{order.shipment.commodityType}</p>
          </div>
          <SupplierStatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipment</div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
            <Info label="Commodity" value={order.shipment.commodityType} />
            <Info label="Pallet count" value={`${order.shipment.palletCount}`} />
            <Info label="Weight" value={`${order.shipment.weightLbs.toLocaleString()} lbs`} />
            <Info label="Dispatch time" value={order.dispatch.time} />
            <Info label="Dispatch place" value={order.dispatch.place} />
            <LinkedInfo href={getSupplierOrderLoadHref(order)} label="Load" value={load.loadNo} />
          </dl>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tender</div>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <Info label="Tender no." value={order.tender.tenderNo} />
            <Info label="Reference" value={order.tender.referenceNo} />
            <Info label="Mode" value={order.tender.mode} />
            <Info label="Equipment" value={order.tender.equipment} />
            <Info label="Temperature" value={order.tender.temperatureF == null ? "Ambient" : `${order.tender.temperatureF} °F`} />
            <Info label="Payment" value={order.tender.paymentTerms} />
          </dl>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order details</div>
            <div className="mt-1 text-sm text-gray-500">
              {order.order.date} · {order.order.time}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-gray-500">Total</div>
            <div className="text-lg font-semibold text-gray-900">{formatUSD(order.order.totalPrice)}</div>
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3">SKU</th>
              <th className="px-5 py-3">Item</th>
              <th className="px-5 py-3 text-right">Qty</th>
              <th className="px-5 py-3 text-right">Unit</th>
              <th className="px-5 py-3 text-right">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.order.items.map((item) => (
              <tr key={item.sku}>
                <td className="px-5 py-3 font-medium text-gray-900">{item.sku}</td>
                <td className="px-5 py-3 text-gray-600">{item.description}</td>
                <td className="px-5 py-3 text-right text-gray-600">{item.quantity.toLocaleString()}</td>
                <td className="px-5 py-3 text-right text-gray-600">{formatUSD(item.unitPrice)}</td>
                <td className="px-5 py-3 text-right font-medium text-gray-900">{formatUSD(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Workflow</div>
        <div className="mt-1 text-sm font-semibold text-gray-900">{currentStep.label}</div>
        <p className="mt-1 text-sm text-gray-500">{currentStep.description}</p>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function LinkedInfo({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5">
        <Link className="font-medium text-orange-700 hover:text-orange-800 hover:underline" href={href}>
          {value}
        </Link>
      </dd>
    </div>
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
