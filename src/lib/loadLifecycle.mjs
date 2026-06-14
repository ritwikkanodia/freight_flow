export const LOAD_LIFECYCLE_STEPS = [
  {
    id: "order-sent",
    label: "Order sent to supplier",
    description: "Purchase order transmitted to the supplier.",
  },
  {
    id: "supplier-confirmed",
    label: "Supplier confirmed order",
    description: "Supplier accepted the order and committed the freight.",
  },
  {
    id: "load-created",
    label: "Load created",
    description: "Transportation load record opened.",
  },
  {
    id: "details-populated",
    label: "Details populated",
    description: "Stops, equipment, rates, and freight details are available.",
  },
  {
    id: "posted",
    label: "Posted to loadboard",
    description: "Load is advertised for carriers to bid on.",
  },
  {
    id: "booked",
    label: "Booked",
    description: "Carrier and driver assignment confirmed.",
  },
  {
    id: "dispatch",
    label: "Dispatch monitoring",
    description: "Tracking begins from current driver location.",
  },
  {
    id: "pickup",
    label: "Pickup",
    description: "Driver arrives, loads, and departs pickup.",
  },
  {
    id: "in-transit",
    label: "In transit",
    description: "Linehaul GPS and exception monitoring.",
  },
  {
    id: "offload",
    label: "Delivery offload",
    description: "Receiver arrival and unload confirmation.",
  },
  {
    id: "pod",
    label: "POD received",
    description: "Warehouse signs the proof of delivery.",
  },
  {
    id: "complete",
    label: "Delivery complete",
    description: "Delivery can be closed after POD sign-off.",
  },
];

export function buildLoadLifecycle(load, trackingFrame = null) {
  const currentStepId = getCurrentStepId(load, trackingFrame);
  const currentIndex = LOAD_LIFECYCLE_STEPS.findIndex((step) => step.id === currentStepId);
  const doneThroughIndex = getDoneThroughIndex(load, trackingFrame, currentIndex);

  return LOAD_LIFECYCLE_STEPS.map((step, index) => ({
    ...step,
    state: getStepState(load, index, currentIndex, doneThroughIndex),
  }));
}

function getStepState(load, index, currentIndex, doneThroughIndex) {
  if (load.status === "Cancelled" && index > doneThroughIndex) return "blocked";
  if (index <= doneThroughIndex) return "done";
  if (index === currentIndex) return "current";
  return "pending";
}

function getDoneThroughIndex(load, trackingFrame, currentIndex) {
  if (load.status === "Delivered" || trackingFrame?.status === "Delivered") {
    return LOAD_LIFECYCLE_STEPS.length - 1;
  }

  if (trackingFrame) {
    return Math.max(0, currentIndex - 1);
  }

  if (isBooked(load)) return stepIndex("posted");
  if (hasPostedLoadboardAd(load)) return stepIndex("posted");
  if (hasLoadDetails(load)) return stepIndex("details-populated");
  return stepIndex("load-created");
}

function getCurrentStepId(load, trackingFrame) {
  if (trackingFrame) {
    if (trackingFrame.status === "Delivered") return "complete";
    if (trackingFrame.status === "Proof of delivery pending") return "pod";
    if (trackingFrame.status === "Offload in progress") return "offload";
    if (
      trackingFrame.status === "In transit" ||
      trackingFrame.status === "ETA risk" ||
      trackingFrame.status === "Recovery monitoring"
    ) {
      return "in-transit";
    }
    if (trackingFrame.status === "At pickup") return "pickup";
    return "dispatch";
  }

  if (load.status === "Delivered") return "complete";
  if (load.status === "Enroute") return "in-transit";
  if (load.status === "At Pickup") return "pickup";
  if (isBooked(load)) return "booked";
  if (hasPostedLoadboardAd(load) || load.status === "Published") return "booked";
  if (load.status === "Created") return "posted";
  return "load-created";
}

function isBooked(load) {
  return Boolean(load.carrier || load.driver || load.carrierRate != null || ["Booked", "At Pickup", "Enroute", "Delivered"].includes(load.status));
}

function hasPostedLoadboardAd(load) {
  return Boolean(load.postings?.some((posting) => posting.status === "Posted"));
}

function hasLoadDetails(load) {
  return Boolean(load.pickup && load.dropoff && load.distanceMiles && load.equipment && load.customerRate);
}

function stepIndex(id) {
  return LOAD_LIFECYCLE_STEPS.findIndex((step) => step.id === id);
}
