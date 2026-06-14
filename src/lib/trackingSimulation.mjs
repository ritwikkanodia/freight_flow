const TOTAL_DURATION_MS = 95_000;

const PHASES = [
  {
    startMs: 0,
    endMs: 14_000,
    status: "Dispatch monitoring",
    riskLevel: "normal",
    progressStart: 4,
    progressEnd: 8,
    location: (load) => load.currentLocation || `${load.pickup.city}, ${load.pickup.state}`,
    nextCheckpoint: "Pickup arrival",
    eta: "On schedule",
    speedMph: 0,
    accuracyFt: 38,
    headingDeg: 84,
    insight: {
      title: "Pickup readiness confirmed",
      summary: "AI monitoring has started and the driver remains on schedule for pickup.",
      recommendedAction: "No dispatcher action required. Continue passive monitoring until pickup geofence entry.",
      customerUpdate: "Pickup remains on schedule.",
    },
  },
  {
    startMs: 14_000,
    endMs: 30_000,
    status: "At pickup",
    riskLevel: "normal",
    progressStart: 8,
    progressEnd: 24,
    location: (load) => `${load.pickup.city}, ${load.pickup.state} pickup geofence`,
    nextCheckpoint: "Loaded and departed",
    eta: "On schedule",
    speedMph: 3,
    accuracyFt: 27,
    headingDeg: 92,
    insight: {
      title: "Pickup geofence entered",
      summary: "Driver is at the pickup stop and the appointment window is still protected.",
      recommendedAction: "Wait for loading confirmation. Escalate only if dwell exceeds the planned pickup buffer.",
      customerUpdate: "Driver is at pickup.",
    },
  },
  {
    startMs: 30_000,
    endMs: 52_000,
    status: "In transit",
    riskLevel: "normal",
    progressStart: 24,
    progressEnd: 54,
    location: () => "I-20 E near Shreveport, LA",
    nextCheckpoint: "Mid-route check-in",
    eta: "On schedule",
    speedMph: 62,
    accuracyFt: 31,
    headingDeg: 88,
    insight: {
      title: "Linehaul moving",
      summary: "Driver has departed pickup and is tracking near the planned route.",
      recommendedAction: "Continue automated monitoring. No customer-facing update needed.",
      customerUpdate: "Shipment is in transit.",
    },
  },
  {
    startMs: 52_000,
    endMs: 72_000,
    status: "ETA risk",
    riskLevel: "attention",
    progressStart: 56,
    progressEnd: 72,
    location: () => "I-20 E near Monroe, LA",
    nextCheckpoint: "Recovery confirmation",
    eta: "42 min behind plan",
    speedMph: 37,
    accuracyFt: 35,
    headingDeg: 91,
    insight: {
      title: "ETA risk from slowed progress",
      summary: "GPS progress fell behind plan after extended loading and slower traffic east of Shreveport.",
      recommendedAction: "Notify receiving with the revised ETA, ask them to hold the dock, and keep the customer update factual.",
      customerUpdate: "Driver is moving toward delivery, but current traffic has pushed the ETA later. Receiving is being contacted to protect the dock appointment.",
    },
  },
  {
    startMs: 72_000,
    endMs: 88_000,
    status: "Recovery monitoring",
    riskLevel: "watch",
    progressStart: 72,
    progressEnd: 92,
    location: () => "US-84 E near Enterprise, AL",
    nextCheckpoint: "Drop-off arrival",
    eta: "Recovering",
    speedMph: 58,
    accuracyFt: 33,
    headingDeg: 104,
    insight: {
      title: "Recovery plan active",
      summary: "Receiving acknowledged the revised ETA and the load is recovering toward the delivery window.",
      recommendedAction: "Monitor the next GPS ping and hold customer escalation unless progress degrades again.",
      customerUpdate: "Receiving has been notified and the driver is continuing toward delivery.",
    },
  },
  {
    startMs: 88_000,
    endMs: 95_000,
    status: "Offload in progress",
    riskLevel: "normal",
    progressStart: 94,
    progressEnd: 99,
    location: (load) => `${load.dropoff.city}, ${load.dropoff.state} delivery geofence`,
    nextCheckpoint: "Offload confirmation",
    eta: "Arrived",
    speedMph: 0,
    accuracyFt: 24,
    headingDeg: 0,
    insight: {
      title: "Drop-off geofence confirmed",
      summary: "Driver arrived at the receiver and unloading is in progress.",
      recommendedAction: "Wait for offload confirmation before marking delivered.",
      customerUpdate: "Driver has arrived at delivery.",
    },
  },
  {
    startMs: 95_000,
    endMs: Infinity,
    status: "Delivered",
    riskLevel: "complete",
    progressStart: 100,
    progressEnd: 100,
    location: (load) => `${load.dropoff.city}, ${load.dropoff.state}`,
    nextCheckpoint: "Proof of delivery",
    eta: "Completed",
    speedMph: 0,
    accuracyFt: 22,
    headingDeg: 0,
    insight: {
      title: "Offload confirmed",
      summary: "Driver app update confirmed offload completion with no shortage, damage, or detention reported.",
      recommendedAction: "Move proof-of-delivery collection to the next task and close in-transit monitoring.",
      customerUpdate: "Shipment has delivered and offload is complete.",
    },
  },
];

const MONITORING_UPDATES = [
  {
    startMs: 0,
    completeMs: 3_000,
    type: "gps",
    title: "Tracking session opened",
    purpose: "Started passive GPS monitoring from current driver location.",
    message: "GPS stream opened from the driver's current location. Pickup appointment remains on schedule.",
  },
  {
    startMs: 8_000,
    completeMs: 11_000,
    type: "app",
    title: "Dispatch readiness logged",
    purpose: "Captured driver readiness without a call.",
    message: "Driver app status shows reefer set, documents ready, and no pickup blockers reported.",
  },
  {
    startMs: 16_000,
    completeMs: 18_000,
    type: "geofence",
    title: "Pickup geofence entered",
    purpose: "Confirmed arrival at shipper from GPS geofence.",
    message: "Driver entered the pickup geofence. Dwell timer started against the planned pickup buffer.",
  },
  {
    startMs: 24_000,
    completeMs: 26_000,
    type: "sms",
    title: "Pickup SMS update sent",
    purpose: "Notify shipper/customer without calling the driver.",
    message: "SMS sent: Driver is at pickup and loading is in progress. No delay risk reported.",
  },
  {
    startMs: 31_000,
    completeMs: 34_000,
    type: "gps",
    title: "Departed pickup",
    purpose: "Detected outbound movement after loading.",
    message: "GPS movement confirms the driver departed pickup and is tracking along the planned route.",
  },
  {
    startMs: 43_000,
    completeMs: 46_000,
    type: "signal",
    title: "GPS signal degraded",
    purpose: "Flag temporary telemetry loss before escalating.",
    message: "GPS accuracy degraded and two pings were missed. System is watching for automatic signal recovery before human escalation.",
  },
  {
    startMs: 48_000,
    completeMs: 50_000,
    type: "signal",
    title: "GPS signal restored",
    purpose: "Close temporary signal-loss watch.",
    message: "GPS pings resumed with normal accuracy. No dispatcher action needed.",
  },
  {
    startMs: 54_000,
    completeMs: 63_000,
    type: "call",
    title: "ETA risk call",
    purpose: "Escalated call because GPS progress fell behind plan.",
    message: "Call completed. Driver confirmed long loading and slower traffic. Receiving should hold the dock for the revised ETA.",
    transcript:
      "AI: GPS progress is trending behind plan. What changed? Driver: Loading ran long and traffic slowed near Shreveport. I can still deliver if receiving holds the dock for the revised ETA. AI: What should dispatch do? Driver: Notify receiving and customer with the revised arrival.",
  },
  {
    startMs: 65_000,
    completeMs: 67_000,
    type: "sms",
    title: "Revised ETA SMS sent",
    purpose: "Notify receiver/customer after the escalated call.",
    message: "SMS sent: Driver is moving, revised ETA is later due to loading and traffic. Receiving has been asked to hold the dock.",
  },
  {
    startMs: 73_000,
    completeMs: 76_000,
    type: "gps",
    title: "Recovery trend detected",
    purpose: "Confirm progress after escalation.",
    message: "GPS speed and route adherence improved. The load is recovering toward the delivery window.",
  },
  {
    startMs: 88_000,
    completeMs: 90_000,
    type: "geofence",
    title: "Drop-off geofence entered",
    purpose: "Confirm receiver arrival from GPS.",
    message: "Driver entered the drop-off geofence. Offload timer started.",
  },
  {
    startMs: 94_000,
    completeMs: 95_000,
    type: "app",
    title: "Offload confirmed in app",
    purpose: "Close delivery monitoring without a call.",
    message: "Driver app update confirms offload completed with no shortage, damage, or detention reported.",
  },
];

export function getTrackingFrame(load, elapsedMs, durationMs = TOTAL_DURATION_MS) {
  const safeElapsed = Math.max(0, elapsedMs);
  const adjustedElapsed = durationMs === TOTAL_DURATION_MS
    ? safeElapsed
    : Math.min(TOTAL_DURATION_MS, (safeElapsed / durationMs) * TOTAL_DURATION_MS);
  const phase = PHASES.find((item) => adjustedElapsed >= item.startMs && adjustedElapsed < item.endMs) || PHASES[PHASES.length - 1];
  const phaseProgress = phase.endMs === Infinity ? 1 : ratio(adjustedElapsed, phase.startMs, phase.endMs);
  const progressPct = Math.round(lerp(phase.progressStart, phase.progressEnd, phaseProgress));
  const routeCoordinates = getStopCoordinates(load);

  return {
    status: phase.status,
    riskLevel: phase.riskLevel,
    progressPct,
    location: phase.location(load),
    nextCheckpoint: phase.nextCheckpoint,
    eta: phase.eta,
    speedMph: phase.speedMph,
    accuracyFt: phase.accuracyFt,
    headingDeg: phase.headingDeg,
    coordinates: interpolateRouteCoordinate(routeCoordinates, progressPct),
    startCoordinates: routeCoordinates.start,
    pickupCoordinates: routeCoordinates.pickup,
    dropoffCoordinates: routeCoordinates.dropoff,
    temperature: load.temperatureF == null ? null : `${load.temperatureF} °F`,
    lastPingLabel: `${Math.max(3, 12 - Math.floor(adjustedElapsed / 12_000))} sec ago`,
    isComplete: progressPct === 100,
    insight: phase.insight,
    updates: MONITORING_UPDATES.filter((update) => adjustedElapsed >= update.startMs).map((update) => ({
      type: update.type,
      title: update.title,
      purpose: update.purpose,
      message: update.message,
      transcript: update.transcript,
      state: adjustedElapsed >= update.completeMs ? "complete" : "scheduled",
    })),
    calls: MONITORING_UPDATES.filter((update) => update.type === "call" && adjustedElapsed >= update.startMs).map((update) => ({
      title: update.title,
      purpose: update.purpose,
      transcript: update.transcript,
      state: adjustedElapsed >= update.completeMs ? "complete" : "scheduled",
    })),
  };
}

export function getStopCoordinates(load) {
  const startKey = load.currentLocation || stopKey(load.pickup);
  const pickupKey = stopKey(load.pickup);
  const dropoffKey = stopKey(load.dropoff);

  return {
    start: STOP_COORDINATES[startKey] || STOP_COORDINATES[pickupKey] || { lat: 32.7767, lng: -96.7970 },
    pickup: STOP_COORDINATES[pickupKey] || { lat: 32.7767, lng: -96.7970 },
    dropoff: STOP_COORDINATES[dropoffKey] || { lat: 31.3852, lng: -85.9294 },
  };
}

export function buildCallRecordingSegments(transcript) {
  const segments = [];
  const pattern = /(AI|Driver):\s*/g;
  const matches = [...transcript.matchAll(pattern)];

  matches.forEach((match, index) => {
    const next = matches[index + 1];
    const textStart = match.index + match[0].length;
    const textEnd = next ? next.index : transcript.length;
    const text = transcript.slice(textStart, textEnd).trim();

    if (text) {
      segments.push({
        speaker: match[1],
        text,
      });
    }
  });

  return segments;
}

const STOP_COORDINATES = {
  "Dallas, TX": { lat: 32.7767, lng: -96.7970 },
  "New Brockton, AL": { lat: 31.3852, lng: -85.9294 },
  "Garland, TX": { lat: 32.9126, lng: -96.6389 },
  "Mcallen, TX": { lat: 26.2034, lng: -98.2300 },
  "Laredo, TX": { lat: 27.5036, lng: -99.5076 },
  "Watsonville, CA": { lat: 36.9102, lng: -121.7569 },
  "Santa Maria, CA": { lat: 34.9530, lng: -120.4357 },
  "Boise, ID": { lat: 43.6150, lng: -116.2023 },
  "Oxnard, CA": { lat: 34.1975, lng: -119.1771 },
  "Grandview, WA": { lat: 46.2554, lng: -119.9017 },
  "Seattle, WA": { lat: 47.6061, lng: -122.3328 },
};

function stopKey(stop) {
  return `${stop.city}, ${stop.state}`;
}

function interpolateRouteCoordinate(routeCoordinates, progressPct) {
  if (progressPct >= 100) return routeCoordinates.dropoff;
  if (progressPct <= 24) {
    return interpolateCoordinate(routeCoordinates.start, routeCoordinates.pickup, progressPct / 24);
  }

  return interpolateCoordinate(routeCoordinates.pickup, routeCoordinates.dropoff, (progressPct - 24) / 76);
}

function interpolateCoordinate(start, end, amountValue) {
  const amount = Math.max(0, Math.min(1, amountValue));
  const curve = Math.sin(amount * Math.PI) * 0.35;

  return {
    lat: roundCoordinate(lerp(start.lat, end.lat, amount) + curve),
    lng: roundCoordinate(lerp(start.lng, end.lng, amount)),
  };
}

function roundCoordinate(value) {
  return Math.round(value * 10_000) / 10_000;
}

function ratio(value, start, end) {
  if (end <= start) return 1;
  return Math.max(0, Math.min(1, (value - start) / (end - start)));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}
