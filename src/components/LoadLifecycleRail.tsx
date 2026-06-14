import type { Load } from "@/lib/loads";
import { buildLoadLifecycle } from "@/lib/loadLifecycle.mjs";
import type { TrackingFrame } from "@/lib/trackingSimulation.mjs";

export function LoadLifecycleRail({
  load,
  trackingFrame,
}: {
  load: Load;
  trackingFrame?: TrackingFrame | null;
}) {
  const steps = buildLoadLifecycle(load, trackingFrame);
  const currentStep = steps.find((step) => step.state === "current");

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Fulfillment lifecycle</div>
          <h2 className="mt-1 text-base font-semibold text-gray-900">
            {currentStep?.label ?? "Delivery complete"}
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
          Order to POD
        </span>
      </div>

      <ol className="flex gap-3 overflow-x-auto pb-1">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-44 flex-1 items-stretch">
            <div className={`flex w-full flex-col rounded-lg border px-3 py-3 ${stepCardClass(step.state)}`}>
              <div className="flex items-center gap-2">
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${stepDotClass(step.state)}`}>
                  {step.state === "done" ? "✓" : index + 1}
                </span>
                <span className="text-sm font-semibold text-gray-900">{step.label}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-gray-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function stepCardClass(state: string) {
  if (state === "done") return "border-green-200 bg-green-50/60";
  if (state === "current") return "border-orange-300 bg-orange-50 shadow-[0_0_0_1px_rgba(249,115,22,0.12)]";
  if (state === "blocked") return "border-red-200 bg-red-50";
  return "border-gray-200 bg-gray-50";
}

function stepDotClass(state: string) {
  if (state === "done") return "bg-green-600 text-white";
  if (state === "current") return "bg-orange-500 text-white";
  if (state === "blocked") return "bg-red-600 text-white";
  return "bg-gray-200 text-gray-600";
}
