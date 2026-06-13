// Mock data for the TMS MVP. No DB — a single in-memory module.
// Swap this file for a real data source later without touching the UI.

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

export interface Load {
  /** Slug used in the URL */
  id: string;
  loadNo: string;
  customerLoadNo?: string;
  customer: string;
  status: LoadStatus;

  pickup: Stop;
  dropoff: Stop;

  carrier?: string;
  driver?: Driver;

  // Rates in USD. carrierRate omitted => not yet booked / published.
  customerRate: number;
  carrierRate?: number;

  // Load info
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
}

const COMMON_TASKS: Task[] = [
  { label: "Booked by AI Agent - Verify with Carrier", status: "To Do" },
  { label: "Verify Carrier Compliance", status: "To Do" },
  { label: "Verify Load before Pickup", status: "To Do" },
  { label: "Verify Pick Appointments Scheduled", status: "To Do" },
  { label: "Verify Delivery Appointments Scheduled", status: "To Do" },
  { label: "Driver Onboarding - AI Agent", status: "To Do" },
  { label: "In Transit Monitoring - AI Agent", status: "In Progress" },
  { label: "Proof of Delivery", status: "To Do" },
];

export const loads: Load[] = [
  {
    id: "236568",
    loadNo: "236568",
    customerLoadNo: "153241",
    customer: "Lipman Family Farms (Texas)",
    status: "At Pickup",
    pickup: { city: "Dallas", state: "TX", dateTime: "Sat Jun 13 · 03:30 PM CDT" },
    dropoff: { city: "New Brockton", state: "AL", dateTime: "Mon Jun 15 · 06:00 AM" },
    carrier: "BH Trans Inc",
    driver: { name: "Steven Holmes", phone: "+1 (850) 718-7337", rating: 0 },
    customerRate: 3400,
    carrierRate: 2700,
    distanceMiles: 695,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 42000,
    cargoValue: "$75,000 - $100,000",
    temperatureMode: "Continuous",
    temperatureF: 33,
    currentLocation: "Garland, TX",
    tasks: [
      { label: "Booked by AI Agent - Verify with Carrier", status: "To Do" },
      { label: "Verify Carrier Compliance", status: "Done" },
      { label: "Verify Load before Pickup", status: "Done" },
      { label: "Verify Pick Appointments Scheduled", status: "Done" },
      { label: "Verify Delivery Appointments Scheduled", status: "Done" },
      { label: "Driver Onboarding - AI Agent", status: "Done" },
      { label: "In Transit Monitoring - AI Agent", status: "In Progress" },
      { label: "Proof of Delivery", status: "To Do" },
    ],
  },
  {
    id: "236564",
    loadNo: "236564",
    customerLoadNo: "test load",
    customer: "Abarrotera Central",
    status: "Cancelled",
    pickup: { city: "Mcallen", state: "TX", dateTime: "Sat Jun 13 · 03:00 PM CDT" },
    dropoff: { city: "Laredo", state: "TX", dateTime: "Sun Jun 14 · 08:00 AM" },
    customerRate: 1000,
    distanceMiles: 150,
    equipment: "Dry Van",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 30000,
    cargoValue: "$10,000 - $25,000",
    tasks: COMMON_TASKS,
  },
  {
    id: "236556",
    loadNo: "236556",
    customerLoadNo: "4400057459 & 4400057215",
    customer: "Hortifrut Imports",
    status: "Enroute",
    pickup: { city: "Mcallen", state: "TX", dateTime: "Sat Jun 13 · 10:00 AM CDT" },
    dropoff: { city: "Watsonville", state: "CA", dateTime: "Mon Jun 15 · 02:00 PM" },
    carrier: "Khokhar Road Carrier Inc",
    driver: { name: "Harbhajan Singh", phone: "+1 (559) 555-0142", rating: 4 },
    customerRate: 6700,
    carrierRate: 5500,
    distanceMiles: 1980,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Team",
    weightLbs: 41500,
    cargoValue: "$100,000 - $150,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    currentLocation: "El Paso, TX",
    tasks: COMMON_TASKS,
  },
  {
    id: "236548",
    loadNo: "236548",
    customerLoadNo: "4400057322",
    customer: "Hortifrut Imports",
    status: "Created",
    pickup: { city: "Mcallen", state: "TX", dateTime: "Mon Jun 15 · 11:30 AM" },
    dropoff: { city: "Watsonville", state: "CA", dateTime: "Wed Jun 17 · 08:00 AM" },
    customerRate: 6300,
    distanceMiles: 1980,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Team",
    weightLbs: 41000,
    cargoValue: "$100,000 - $150,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    tasks: COMMON_TASKS.slice(0, 3),
  },
  {
    id: "236544",
    loadNo: "236544",
    customer: "Windset Farms",
    status: "Published",
    pickup: { city: "Santa Maria", state: "CA", dateTime: "Mon Jun 15 · 04:00 PM" },
    dropoff: { city: "Boise", state: "ID", dateTime: "Wed Jun 17 · 08:00 AM" },
    customerRate: 5000,
    distanceMiles: 920,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 38000,
    cargoValue: "$50,000 - $75,000",
    temperatureMode: "Continuous",
    temperatureF: 36,
    tasks: COMMON_TASKS.slice(0, 3),
  },
  {
    id: "236048",
    loadNo: "236048",
    customerLoadNo: "7633787",
    customer: "Chiquita Fresh North America LLC",
    status: "Booked",
    pickup: { city: "Oxnard", state: "CA", dateTime: "Mon Jun 15 · 08:00 AM" },
    dropoff: { city: "Grandview", state: "WA", dateTime: "Wed Jun 17 · 02:45 AM" },
    carrier: "Raptor Trans LLC",
    driver: { name: "Manjit Gill", phone: "+1 (509) 555-0188", rating: 5 },
    customerRate: 5760,
    carrierRate: 5500,
    distanceMiles: 1100,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 40000,
    cargoValue: "$75,000 - $100,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    tasks: COMMON_TASKS,
  },
  {
    id: "236052",
    loadNo: "236052",
    customerLoadNo: "7697595",
    customer: "Chiquita Fresh North America LLC",
    status: "Created",
    pickup: { city: "Oxnard", state: "CA", dateTime: "Fri Jun 19 · 08:00 AM PDT" },
    dropoff: { city: "Seattle", state: "WA", dateTime: "Sun Jun 21 · 10:00 AM" },
    customerRate: 6075,
    distanceMiles: 1200,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 40000,
    cargoValue: "$75,000 - $100,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    tasks: COMMON_TASKS.slice(0, 3),
  },
  {
    id: "236040",
    loadNo: "236040",
    customerLoadNo: "7633801",
    customer: "Chiquita Fresh North America LLC",
    status: "Booked",
    pickup: { city: "Oxnard", state: "CA", dateTime: "Mon Jun 15 · 08:00 AM" },
    dropoff: { city: "Grandview", state: "WA", dateTime: "Wed Jun 17 · 02:45 AM" },
    carrier: "S Sandhar Transport Inc",
    driver: { name: "Gurpreet Sandhar", phone: "+1 (509) 555-0177", rating: 4 },
    customerRate: 5760,
    carrierRate: 5500,
    distanceMiles: 1100,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 40000,
    cargoValue: "$75,000 - $100,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    tasks: COMMON_TASKS,
  },
];

export function getLoad(id: string): Load | undefined {
  return loads.find((l) => l.id === id);
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
