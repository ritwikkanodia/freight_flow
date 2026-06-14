import assert from "node:assert/strict";
import test from "node:test";

import { buildCallRecordingSegments, getTrackingFrame } from "../src/lib/trackingSimulation.mjs";

const load = {
  loadNo: "236568",
  pickup: { city: "Houston", state: "TX", dateTime: "Sat Jun 13 · 03:30 PM CDT" },
  dropoff: { city: "Dothan", state: "AL", dateTime: "Mon Jun 15 · 06:00 AM" },
  currentLocation: "Mesquite, TX",
  driver: { name: "Marcus Ellison", phone: "+1 (850) 624-9108", rating: 0 },
  carrier: "Blue Mesa Freight LLC",
  temperatureMode: "Continuous",
  temperatureF: 33,
};

test("simulated tracking starts at pickup monitoring without manual advancement", () => {
  const frame = getTrackingFrame(load, 0);

  assert.equal(frame.status, "Dispatch monitoring");
  assert.equal(frame.progressPct, 4);
  assert.equal(frame.startCoordinates.lng, -96.5992);
  assert.equal(frame.pickupCoordinates.lng, -95.3698);
  assert.notDeepEqual(frame.startCoordinates, frame.pickupCoordinates);
  assert.equal(frame.updates.length, 1);
  assert.equal(frame.updates[0].title, "Tracking session opened");
  assert.equal(frame.updates[0].type, "gps");
  assert.equal(frame.updates[0].state, "scheduled");
  assert.equal(frame.calls.length, 0);
  assert.equal(frame.isComplete, false);
});

test("simulated tracking surfaces ETA risk and escalates with a completed call only after routine checks", () => {
  const frame = getTrackingFrame(load, 64_000);

  assert.equal(frame.status, "ETA risk");
  assert.equal(frame.riskLevel, "attention");
  assert.ok(frame.progressPct >= 55);
  assert.ok(frame.updates.some((update) => update.type === "signal" && update.title === "GPS signal restored"));
  assert.ok(frame.updates.some((update) => update.type === "call" && update.state === "complete" && update.title === "ETA risk call"));
  assert.ok(frame.updates.some((update) => update.severity === "escalation" && update.title === "ETA risk call"));
  assert.deepEqual(frame.calls.map((call) => call.title), ["ETA risk call"]);
  assert.equal(frame.calls[0].severity, "escalation");
  assert.match(frame.insight.recommendedAction, /receiving/i);
});

test("simulated tracking waits for warehouse POD before marking delivery complete", () => {
  const frame = getTrackingFrame(load, 96_000);

  assert.equal(frame.status, "Proof of delivery pending");
  assert.equal(frame.isComplete, false);
  assert.ok(frame.progressPct < 100);
  assert.ok(frame.updates.some((update) => update.title === "Offload confirmed in app" && update.state === "complete"));
  assert.ok(frame.updates.some((update) => update.title === "POD received" && update.state === "scheduled"));
});

test("simulated tracking completes after POD is received", () => {
  const frame = getTrackingFrame(load, 110_000);

  assert.equal(frame.status, "Delivered");
  assert.equal(frame.progressPct, 100);
  assert.equal(frame.riskLevel, "complete");
  assert.equal(frame.isComplete, true);
  assert.deepEqual(frame.coordinates, frame.dropoffCoordinates);
  assert.ok(frame.updates.some((update) => update.title === "Offload confirmed in app" && update.state === "complete"));
  assert.ok(frame.updates.some((update) => update.title === "POD received" && update.state === "complete"));
  assert.equal(frame.calls.length, 1);
});

test("call transcripts are split into playable speaker segments", () => {
  const segments = buildCallRecordingSegments(
    "AI: Checking location. Driver: I am at the dock. AI: Confirmed."
  );

  assert.deepEqual(segments, [
    { speaker: "AI", text: "Checking location." },
    { speaker: "Driver", text: "I am at the dock." },
    { speaker: "AI", text: "Confirmed." },
  ]);
});
