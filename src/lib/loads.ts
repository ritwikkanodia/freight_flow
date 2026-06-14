// Data layer for the TMS frontend.
//
// Types mirror the JSON shape returned by the Flask API. Data is fetched
// from the backend (see /backend) — the SQLite DB is the source of truth.

export type LoadStatus =
  | "Created"
  | "Published"
  | "Booked"
  | "At Pickup"
  | "Enroute"
  | "Delivered"
  | "Cancelled";

export interface Stop {
  city: string;
  state: string;
  /** Human-readable date/time, e.g. "Sat Jun 13 · 03:30 PM CDT" */
  dateTime: string;
}

export interface Driver {
  name: string;
  phone: string;
  rating: number; // 0-5
}

export interface Task {
  label: string;
  status: "To Do" | "In Progress" | "Done";
}

/** A posting of the load to an external load board (Trucker Path, DAT, ...). */
export interface Posting {
  id: number;
  partner: "Trucker Path" | "DAT" | "Truckstop";
  referenceNo: string;
  status: "Posted" | "Unposted";
  comments?: string;
  price?: number;
  postId?: string;
  postedBy?: string;
  postedAt?: string;
  contactMethods?: string;
  unpostAfter?: string;
  unpostedBy?: string;
  unpostedAt?: string;
  agent?: { name: string; phone: string; email: string };
}

export interface Load {
  id: string;
  loadNo: string;
  customerLoadNo?: string;
  customer: string;
  status: LoadStatus;

  pickup: Stop;
  dropoff: Stop;

  carrier?: string;
  driver?: Driver;

  customerRate: number;
  carrierRate?: number;

  // Load info (present on the detail endpoint)
  distanceMiles: number;
  equipment: string;
  loadSize: string;
  driverType: string;
  weightLbs: number;
  cargoValue: string;
  temperatureMode?: string;
  temperatureF?: number;

  currentLocation?: string;
  tasks: Task[];
  postings?: Posting[];
}

/**
 * A single live posting as shown on the carrier-facing load board.
 * Combines the posting (price, partner, contact) with the load's route
 * and freight details. Returned by GET /api/loadboard.
 */
export interface LoadBoardItem {
  loadId: string;
  loadNo: string;
  partner: Posting["partner"];
  referenceNo: string;
  price?: number;
  postedAt?: string;
  comments?: string;
  contactMethods?: string;
  pickup: Stop;
  dropoff: Stop;
  distanceMiles: number;
  equipment: string;
  loadSize: string;
  driverType: string;
  weightLbs: number;
  temperatureMode?: string;
  temperatureF?: number;
  agent?: { name: string; phone: string; email: string };
}

const API_BASE = process.env.API_BASE_URL ?? "http://127.0.0.1:5001";

/** Fetch the load list (summary rows for the table). */
export async function fetchLoads(): Promise<Load[]> {
  const res = await fetch(`${API_BASE}/api/loads`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load loads (${res.status})`);
  return res.json();
}

/** Fetch a single load with tasks + postings. Returns null on 404. */
export async function fetchLoad(id: string): Promise<Load | null> {
  const res = await fetch(`${API_BASE}/api/loads/${id}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load load ${id} (${res.status})`);
  return res.json();
}

/** Fetch the live load board — every posting currently posted to a partner. */
export async function fetchLoadBoard(): Promise<LoadBoardItem[]> {
  const res = await fetch(`${API_BASE}/api/loadboard`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load load board (${res.status})`);
  return res.json();
}

/** Per-mile rate for a board item, e.g. "$4.57 / mi". Null if no price. */
export function ratePerMile(item: LoadBoardItem): string | null {
  if (item.price == null || !item.distanceMiles) return null;
  return `$${(item.price / item.distanceMiles).toFixed(2)} / mi`;
}

export function margin(load: Load): { amount: number; pct: number } | null {
  if (load.carrierRate == null) return null;
  const amount = load.customerRate - load.carrierRate;
  const pct = (amount / load.customerRate) * 100;
  return { amount, pct };
}

export function formatUSD(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
