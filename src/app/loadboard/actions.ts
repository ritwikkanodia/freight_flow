"use server";

import { revalidatePath } from "next/cache";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:5001";

export type InterestResult = { ok: true } | { ok: false; error: string };

/**
 * A carrier expresses interest in a posted load with a rate offer.
 * Writes the offered rate to the load's carrier_rate via the backend.
 */
export async function expressInterest(
  loadId: string,
  rate: number,
): Promise<InterestResult> {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { ok: false, error: "Enter a rate greater than 0" };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/loads/${loadId}/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.error ?? `Request failed (${res.status})` };
  }

  // The load board itself doesn't display carrier_rate, but the broker's
  // load list/detail do — refresh those views.
  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
  return { ok: true };
}
