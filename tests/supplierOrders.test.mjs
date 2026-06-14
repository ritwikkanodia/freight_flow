import assert from "node:assert/strict";
import test from "node:test";

import { findSupplierOrderById, getSupplierOrdersForLoads, getSupplierOrderLoadHref } from "../src/lib/supplierOrders.mjs";

const loads = [
  {
    id: "236568",
    loadNo: "236568",
    customerLoadNo: "153241",
    customer: "Brazos Valley Produce Co.",
    status: "At Pickup",
    pickup: { city: "Houston", state: "TX", dateTime: "Sat Jun 13 · 03:30 PM CDT" },
    dropoff: { city: "Dothan", state: "AL", dateTime: "Mon Jun 15 · 06:00 AM" },
    customerRate: 3400,
    distanceMiles: 695,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Solo Driver",
    weightLbs: 42000,
    cargoValue: "$75,000 - $100,000",
    tasks: [],
  },
];

test("supplier orders expose shipment, dispatch, status, items, pricing, and tender details", () => {
  const orders = getSupplierOrdersForLoads(loads);
  const order = orders[0];

  assert.equal(order.supplierName, "Brazos Valley Produce Co.");
  assert.equal(order.shipment.commodityType, "Refrigerated produce");
  assert.equal(order.shipment.palletCount, 22);
  assert.equal(order.shipment.weightLbs, 42000);
  assert.equal(order.dispatch.time, "Sat Jun 13 · 03:30 PM CDT");
  assert.equal(order.dispatch.place, "Houston, TX");
  assert.equal(order.status, "accepted");
  assert.equal(order.order.date, "Jun 13, 2026");
  assert.equal(order.order.time, "09:18 AM CDT");
  assert.deepEqual(order.order.items.map((item) => item.sku), ["BV-CR-40", "BV-GR-24", "BV-MX-18"]);
  assert.equal(order.order.items[0].unitPrice, 42);
  assert.equal(order.order.totalPrice, 47440);
  assert.equal(order.tender.referenceNo, "153241");
  assert.equal(order.tender.mode, "FTL Reefer");
  assert.equal(order.tender.temperatureF, 33);
  assert.equal(order.tender.paymentTerms, "Net 30");
});

test("supplier order can be looked up by order id for the detail page", () => {
  const order = findSupplierOrderById(loads, "SO-153241");

  assert.equal(order.loadId, "236568");
  assert.equal(order.id, "SO-153241");
  assert.equal(order.supplierName, "Brazos Valley Produce Co.");
});

test("supplier order exposes the load detail href", () => {
  const order = findSupplierOrderById(loads, "SO-153241");

  assert.equal(getSupplierOrderLoadHref(order), "/loads/236568");
});
