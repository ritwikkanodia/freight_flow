"use client";

import { useState, useTransition } from "react";
import { expressInterest } from "@/app/loadboard/actions";

export function InterestForm({
  loadId,
  suggestedRate,
}: {
  loadId: string;
  suggestedRate?: number;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [rate, setRate] = useState(suggestedRate != null ? String(suggestedRate) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="rounded-md bg-green-50 px-4 py-2 text-center text-sm font-medium text-green-700">
        ✓ Offer of ${Number(rate).toLocaleString()} submitted
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="block w-full rounded-md bg-orange-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-orange-600"
      >
        Interested
      </button>
    );
  }

  function submit() {
    setError(null);
    const value = Number(rate);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a rate greater than 0");
      return;
    }
    startTransition(async () => {
      const result = await expressInterest(loadId, value);
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-600">
        Your rate offer (USD)
      </label>
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center rounded-md border border-gray-300 px-2 focus-within:border-orange-500">
          <span className="text-sm text-gray-400">$</span>
          <input
            type="number"
            min="0"
            step="50"
            value={rate}
            autoFocus
            onChange={(e) => setRate(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="0"
            className="w-full bg-transparent px-1 py-2 text-sm outline-none"
          />
        </div>
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Submit"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="rounded-md px-2 py-2 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
