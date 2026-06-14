"use server";

import { revalidatePath } from "next/cache";

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:5001";

export type PostResult = { ok: true } | { ok: false; error: string };

/**
 * Publish a posting to the load board (sets its status to Posted).
 * `loadId` is used to revalidate the detail page that triggered this.
 */
export async function postToLoadBoard(
  postingId: number,
  loadId: string,
): Promise<PostResult> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/postings/${postingId}/post`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.error ?? `Request failed (${res.status})` };
  }

  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/loadboard");
  return { ok: true };
}
