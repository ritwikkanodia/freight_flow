import assert from "node:assert/strict";
import test from "node:test";

import { answerSystemQuestion, buildSystemAssistantContext } from "../src/lib/systemAssistant.mjs";
import { appendThreadTurn, createQueryThread, upsertQueryThread } from "../src/lib/queryLog.mjs";

const loads = [
  {
    id: "236556",
    loadNo: "236556",
    customerLoadNo: "153241",
    customer: "Salinas Valley Produce LLC",
    status: "Booked",
    pickup: { city: "Pharr", state: "TX", dateTime: "Sat Jun 13 · 10:00 AM CDT" },
    dropoff: { city: "Salinas", state: "CA", dateTime: "Mon Jun 15 · 02:00 PM PDT" },
    carrier: "Summit Ridge Transport Inc",
    driver: { name: "Harjit Singh", phone: "+1 (604) 555-0194", rating: 5 },
    customerRate: 7200,
    carrierRate: 5500,
    distanceMiles: 1980,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Team",
    weightLbs: 41500,
    cargoValue: "$84,000",
    temperatureMode: "Continuous",
    temperatureF: 34,
    currentLocation: "Laredo, TX",
    tasks: [],
  },
];

const boardItems = [
  {
    loadId: "236556",
    loadNo: "236556",
    partner: "Trucker Path",
    referenceNo: "261902",
    price: 6500,
    pickup: loads[0].pickup,
    dropoff: loads[0].dropoff,
    distanceMiles: 1980,
    equipment: "Reefer",
    loadSize: "Full Truck Load (FTL)",
    driverType: "Team",
    weightLbs: 41500,
    temperatureMode: "Continuous",
    temperatureF: 34,
  },
];

test("assistant answers carrier bid questions for a specific load", () => {
  const context = buildSystemAssistantContext({ loads, boardItems });
  const answer = answerSystemQuestion("what bids does load 236556 have?", context);

  assert.match(answer.text, /Summit Ridge Transport Inc/);
  assert.match(answer.text, /\$5,500/);
  assert.match(answer.text, /Westline Cold Chain LLC/);
  assert.match(answer.text, /recommended/i);
  assert.deepEqual(answer.links, [{ href: "/loads/236556", label: "Open load 236556" }]);
});

test("assistant answers supplier order questions with shipment and SKU detail", () => {
  const context = buildSystemAssistantContext({ loads, boardItems });
  const answer = answerSystemQuestion("show me SO-153241", context);

  assert.match(answer.text, /Salinas Valley Produce LLC/);
  assert.match(answer.text, /SO-153241/);
  assert.match(answer.text, /Pharr, TX/);
  assert.match(answer.text, /SA-GEN-01/);
  assert.deepEqual(answer.links, [
    { href: "/orders/SO-153241", label: "Open order SO-153241" },
    { href: "/loads/236556", label: "Open load 236556" },
  ]);
});

test("assistant explains the POD gate before delivery can complete", () => {
  const context = buildSystemAssistantContext({ loads, boardItems });
  const answer = answerSystemQuestion("when can we mark the delivery complete?", context);

  assert.match(answer.text, /POD received/i);
  assert.match(answer.text, /warehouse/i);
  assert.match(answer.text, /after offload/i);
});

test("assistant query log stores one entry per thread with turns inside it", () => {
  const thread = createQueryThread({
    id: "thread-1",
    title: "What is load 236556?",
    createdAt: "2026-06-14T06:00:00.000Z",
  });
  const firstTurn = {
    question: "What is load 236556?",
    answer: "Load 236556 is booked.",
    createdAt: "2026-06-14T06:00:00.000Z",
    links: [],
  };
  const secondTurn = {
    question: "Who bid?",
    answer: "Summit Ridge Transport Inc bid $5,500.",
    createdAt: "2026-06-14T06:01:00.000Z",
    links: [],
  };

  const updatedThread = appendThreadTurn(appendThreadTurn(thread, firstTurn), secondTurn);
  const log = upsertQueryThread([], updatedThread);
  const secondWrite = upsertQueryThread(log, appendThreadTurn(updatedThread, {
    question: "When complete?",
    answer: "After POD received.",
    createdAt: "2026-06-14T06:02:00.000Z",
    links: [],
  }));

  assert.equal(secondWrite.length, 1);
  assert.equal(secondWrite[0].title, "What is load 236556?");
  assert.equal(secondWrite[0].turns.length, 3);
  assert.equal(secondWrite[0].turns[0].question, "What is load 236556?");
  assert.equal(secondWrite[0].latestQuestion, "When complete?");
});
