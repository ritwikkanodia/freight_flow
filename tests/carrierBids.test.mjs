import assert from "node:assert/strict";
import test from "node:test";

import { getCarrierBidGroupForLoad, getCarrierBidsForBoardItems, groupCarrierBidsByLoad } from "../src/lib/carrierBids.mjs";

const boardItems = [
  {
    loadId: "236556",
    loadNo: "236556",
    partner: "Trucker Path",
    referenceNo: "261902",
    price: 5500,
    pickup: { city: "Pharr", state: "TX", dateTime: "Sat Jun 13 · 10:00 AM CDT" },
    dropoff: { city: "Salinas", state: "CA", dateTime: "Mon Jun 15 · 02:00 PM" },
    distanceMiles: 1980,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Team",
    weightLbs: 41500,
  },
];

test("carrier bids are internal offers from trucking companies, not the external load board ad", () => {
  const bids = getCarrierBidsForBoardItems(boardItems);

  assert.equal(bids.length, 2);
  assert.equal(bids[0].loadId, "236556");
  assert.equal(bids[0].carrierName, "Summit Ridge Transport Inc");
  assert.equal(bids[0].bidAmount, 5500);
  assert.equal(bids[0].status, "recommended");
  assert.equal(bids[0].sourceBoard, "Trucker Path");
  assert.equal(bids[0].driverType, "Team");
  assert.match(bids[0].notes, /reefer/i);
});

test("carrier bids are grouped under a unique load with a load detail href", () => {
  const bids = getCarrierBidsForBoardItems(boardItems);
  const groups = groupCarrierBidsByLoad(bids);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].loadId, "236556");
  assert.equal(groups[0].loadHref, "/loads/236556");
  assert.equal(groups[0].bids.length, 2);
  assert.deepEqual(groups[0].bids.map((bid) => bid.carrierName), [
    "Summit Ridge Transport Inc",
    "Westline Cold Chain LLC",
  ]);
});

test("carrier bid group can be scoped to a single load detail page", () => {
  const bids = getCarrierBidsForBoardItems(boardItems);
  const group = getCarrierBidGroupForLoad(bids, "236556");

  assert.equal(group.loadId, "236556");
  assert.equal(group.bids.length, 2);
  assert.equal(getCarrierBidGroupForLoad(bids, "missing"), null);
});
