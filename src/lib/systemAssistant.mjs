import { getCarrierBidGroupForLoad, getCarrierBidsForBoardItems, groupCarrierBidsByLoad } from "./carrierBids.mjs";
import { getSupplierOrdersForLoads } from "./supplierOrders.mjs";

export function buildSystemAssistantContext({ loads = [], boardItems = [] } = {}) {
  const supplierOrders = getSupplierOrdersForLoads(loads);
  const bids = getCarrierBidsForBoardItems(boardItems);
  const bidGroups = groupCarrierBidsByLoad(bids);

  return {
    loads,
    boardItems,
    supplierOrders,
    bids,
    bidGroups,
  };
}

export function answerSystemQuestion(question, context) {
  const rawQuestion = String(question || "").trim();
  const normalized = rawQuestion.toLowerCase();

  if (!rawQuestion) {
    return {
      text: "Ask about a load, supplier order, carrier bid, dispatch status, driver, route, tracking signal, or POD requirement.",
      links: [],
    };
  }

  if (mentionsCompletion(normalized)) {
    return {
      text: "Delivery can only be marked complete after offload is finished and POD received is confirmed. POD received means the warehouse or receiver has signed the proof of delivery, so the final delivery state should remain pending until that sign-off is captured.",
      links: [],
    };
  }

  const order = findMentionedOrder(normalized, context.supplierOrders);
  if (order || mentionsSupplierOrder(normalized)) {
    return answerSupplierOrder(order, context);
  }

  const load = findMentionedLoad(normalized, context.loads);
  if (mentionsBid(normalized)) {
    return answerBids(load, context);
  }

  if (load) {
    return answerLoad(load, context);
  }

  if (mentionsRouteOrTracking(normalized)) {
    return answerTrackingOverview(context);
  }

  return answerSystemOverview(context);
}

function answerBids(load, context) {
  if (!load) {
    return {
      text: `I found ${context.bids.length} carrier bid${context.bids.length === 1 ? "" : "s"} across ${context.bidGroups.length} load${context.bidGroups.length === 1 ? "" : "s"}. Ask for a load number to see the bid breakdown.`,
      links: [{ href: "/loadboard", label: "Open carrier bids" }],
    };
  }

  const group = getCarrierBidGroupForLoad(context.bids, load.id);
  if (!group) {
    return {
      text: `Load ${load.loadNo} does not have carrier bids yet. It is currently ${load.status.toLowerCase()} from ${formatStop(load.pickup)} to ${formatStop(load.dropoff)}.`,
      links: [{ href: `/loads/${load.id}`, label: `Open load ${load.loadNo}` }],
    };
  }

  const bidLines = group.bids
    .map((bid) => `${bid.carrierName} bid ${formatUSD(bid.bidAmount)} (${bid.status})`)
    .join("; ");

  return {
    text: `Load ${load.loadNo} has ${group.bids.length} carrier bid${group.bids.length === 1 ? "" : "s"}: ${bidLines}. Source board: ${group.sourceBoards.join(", ")}.`,
    links: [{ href: `/loads/${load.id}`, label: `Open load ${load.loadNo}` }],
  };
}

function answerSupplierOrder(order, context) {
  if (!order) {
    return {
      text: `I found ${context.supplierOrders.length} supplier order${context.supplierOrders.length === 1 ? "" : "s"}. Ask with an order id like ${context.supplierOrders[0]?.id || "SO-153241"} for shipment, SKU, tender, and load details.`,
      links: [{ href: "/orders", label: "Open supplier orders" }],
    };
  }

  const skuSummary = order.order.items
    .slice(0, 3)
    .map((item) => `${item.sku} ${item.description}`)
    .join("; ");

  return {
    text: `${order.id} is ${order.status} for ${order.supplierName}. Shipment: ${order.shipment.commodityType}, ${order.shipment.palletCount} pallets, ${order.shipment.weightLbs.toLocaleString()} lbs. Dispatch is ${order.dispatch.time} from ${order.dispatch.place}. Items include ${skuSummary}. Tender ${order.tender.tenderNo} is ${order.tender.mode} with ${order.tender.paymentTerms} terms.`,
    links: [
      { href: `/orders/${encodeURIComponent(order.id)}`, label: `Open order ${order.id}` },
      { href: `/loads/${order.loadId}`, label: `Open load ${order.loadId}` },
    ],
  };
}

function answerLoad(load, context) {
  const order = context.supplierOrders.find((item) => item.loadId === load.id);
  const bidGroup = context.bidGroups.find((item) => item.loadId === load.id);
  const driverText = load.driver
    ? `${load.driver.name} with ${load.carrier || "assigned carrier"}`
    : "No driver assigned yet";
  const bidText = bidGroup
    ? `${bidGroup.bids.length} carrier bid${bidGroup.bids.length === 1 ? "" : "s"} received`
    : "No carrier bids received yet";

  return {
    text: `Load ${load.loadNo} is ${load.status}. Route: ${formatStop(load.pickup)} to ${formatStop(load.dropoff)}, ${load.distanceMiles.toLocaleString()} miles, ${load.driverType} ${load.equipment}. Supplier order: ${order?.id || "not linked"}. Driver: ${driverText}. Commercials: customer rate ${formatUSD(load.customerRate)}${load.carrierRate == null ? "" : `, carrier rate ${formatUSD(load.carrierRate)}`}. ${bidText}.`,
    links: [{ href: `/loads/${load.id}`, label: `Open load ${load.loadNo}` }],
  };
}

function answerTrackingOverview(context) {
  const trackedLoads = context.loads.filter((load) => ["Booked", "At Pickup", "Enroute", "Delivered"].includes(load.status));

  return {
    text: `Tracking is available after a load is booked. The tracking view shows current driver position, dispatch, pickup, drop-off, route line, GPS health, routine updates, SMS updates, escalation calls, offload, and POD received before final completion. ${trackedLoads.length} load${trackedLoads.length === 1 ? "" : "s"} currently have tracking-ready statuses.`,
    links: [{ href: "/loads", label: "Open loads" }],
  };
}

function answerSystemOverview(context) {
  const booked = context.loads.filter((load) => load.status === "Booked").length;
  const posted = context.loads.filter((load) => load.status === "Published").length;

  return {
    text: `I can answer from the current Freight Flow workspace: ${context.supplierOrders.length} supplier orders, ${context.loads.length} loads, ${posted} posted load${posted === 1 ? "" : "s"}, ${booked} booked load${booked === 1 ? "" : "s"}, and ${context.bids.length} carrier bid${context.bids.length === 1 ? "" : "s"}. Ask about a load number, supplier order, bid, route, driver, dispatch, tracking update, or POD status.`,
    links: [
      { href: "/orders", label: "Orders" },
      { href: "/loads", label: "Loads" },
      { href: "/loadboard", label: "Carrier bids" },
    ],
  };
}

function findMentionedLoad(question, loads) {
  return loads.find((load) => {
    const identifiers = [load.id, load.loadNo, load.customerLoadNo].filter(Boolean).map((value) => String(value).toLowerCase());
    return identifiers.some((identifier) => question.includes(identifier));
  }) || null;
}

function findMentionedOrder(question, orders) {
  return orders.find((order) => question.includes(order.id.toLowerCase())) || null;
}

function mentionsBid(question) {
  return /\b(bid|bids|carrier offer|offer|offers|trucking compan)/i.test(question);
}

function mentionsSupplierOrder(question) {
  return /\b(order|supplier|sku|tender|shipment|dispatch)\b/i.test(question);
}

function mentionsRouteOrTracking(question) {
  return /\b(route|tracking|gps|signal|driver location|eta|pickup|drop|drop-off|dropoff)\b/i.test(question);
}

function mentionsCompletion(question) {
  return /\b(pod|proof of delivery|complete|completion|mark delivered|delivery complete)\b/i.test(question);
}

function formatStop(stop) {
  return `${stop.city}, ${stop.state}`;
}

function formatUSD(value) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
