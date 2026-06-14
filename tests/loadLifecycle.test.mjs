import assert from "node:assert/strict";
import test from "node:test";

import { buildLoadLifecycle } from "../src/lib/loadLifecycle.mjs";
import { getTrackingFrame } from "../src/lib/trackingSimulation.mjs";

const baseLoad = {
  id: "236568",
  loadNo: "236568",
  customer: "Brazos Valley Produce Co.",
  status: "At Pickup",
  pickup: { city: "Houston", state: "TX", dateTime: "Sat Jun 13 · 03:30 PM CDT" },
  dropoff: { city: "Dothan", state: "AL", dateTime: "Mon Jun 15 · 06:00 AM" },
  currentLocation: "Mesquite, TX",
  carrier: "Blue Mesa Freight LLC",
  driver: { name: "Marcus Ellison", phone: "+1 (850) 624-9108", rating: 0 },
  customerRate: 3400,
  carrierRate: 2700,
  distanceMiles: 695,
  equipment: "Reefer",
  loadSize: "Full Truck Load (FTL)",
  driverType: "Solo Driver",
  weightLbs: 42000,
  cargoValue: "$75,000 - $100,000",
  tasks: [],
  postings: [
    { id: 1, partner: "Trucker Path", referenceNo: "261771", status: "Posted" },
  ],
};

test("load lifecycle shows supplier, loadboard, booking, tracking, POD, and completion steps", () => {
  const frame = getTrackingFrame(baseLoad, 96_000);
  const steps = buildLoadLifecycle(baseLoad, frame);

  assert.deepEqual(steps.map((step) => step.label), [
    "Order sent to supplier",
    "Supplier confirmed order",
    "Load created",
    "Details populated",
    "Posted to loadboard",
    "Booked",
    "Dispatch monitoring",
    "Pickup",
    "In transit",
    "Delivery offload",
    "POD received",
    "Delivery complete",
  ]);
  assert.equal(steps.find((step) => step.label === "POD received").state, "current");
  assert.equal(steps.find((step) => step.label === "Delivery complete").state, "pending");
});

test("created loads show upstream fulfillment completed and booking still pending", () => {
  const load = {
    ...baseLoad,
    status: "Created",
    carrier: undefined,
    driver: undefined,
    carrierRate: undefined,
    postings: [],
  };
  const steps = buildLoadLifecycle(load);

  assert.equal(steps.find((step) => step.label === "Order sent to supplier").state, "done");
  assert.equal(steps.find((step) => step.label === "Supplier confirmed order").state, "done");
  assert.equal(steps.find((step) => step.label === "Load created").state, "done");
  assert.equal(steps.find((step) => step.label === "Posted to loadboard").state, "current");
  assert.equal(steps.find((step) => step.label === "Booked").state, "pending");
  assert.equal(steps.find((step) => step.label === "Dispatch monitoring").state, "pending");
});
