const BID_FIXTURES = {
  "236556": [
    {
      carrierName: "Summit Ridge Transport Inc",
      bidAmount: 5500,
      status: "recommended",
      submittedAt: "Jun 13, 2026 · 09:47 AM",
      contactName: "Elena Ward",
      contactPhone: "+1 (559) 555-0142",
      notes: "Team reefer available now. Can protect the Salinas delivery appointment.",
    },
    {
      carrierName: "Westline Cold Chain LLC",
      bidAmount: 5750,
      status: "under review",
      submittedAt: "Jun 13, 2026 · 09:52 AM",
      contactName: "Derek Nolan",
      contactPhone: "+1 (831) 555-0164",
      notes: "Reefer team with produce experience. Requests quick pay.",
    },
  ],
  "236548": [
    {
      carrierName: "Rio Peak Logistics LLC",
      bidAmount: 5900,
      status: "under review",
      submittedAt: "Jun 14, 2026 · 08:18 AM",
      contactName: "Nina Patel",
      contactPhone: "+1 (408) 555-0128",
      notes: "Team reefer bid. Can confirm driver details after tender acceptance.",
    },
  ],
  "236544": [
    {
      carrierName: "Cascade Valley Carriers LLC",
      bidAmount: 4200,
      status: "recommended",
      submittedAt: "Jun 14, 2026 · 07:31 AM",
      contactName: "Mark Sato",
      contactPhone: "+1 (208) 555-0181",
      notes: "Solo reefer positioned near Guadalupe with enough hours for pickup.",
    },
  ],
  "236052": [
    {
      carrierName: "North Fork Refrigerated Inc",
      bidAmount: 5200,
      status: "under review",
      submittedAt: "Jun 14, 2026 · 07:05 AM",
      contactName: "Laura Kim",
      contactPhone: "+1 (253) 555-0106",
      notes: "Solo reefer bid for Tacoma lane. Requests detention terms confirmation.",
    },
  ],
};

export function getCarrierBidsForBoardItems(items) {
  return items.flatMap((item) => {
    const bids = BID_FIXTURES[item.loadId] || buildDefaultBids(item);

    return bids.map((bid) => ({
      ...bid,
      loadId: item.loadId,
      loadNo: item.loadNo,
      sourceBoard: item.partner,
      referenceNo: item.referenceNo,
      pickup: item.pickup,
      dropoff: item.dropoff,
      distanceMiles: item.distanceMiles,
      equipment: item.equipment,
      driverType: item.driverType,
      postedRate: item.price,
      marginToPosted: item.price == null ? null : item.price - bid.bidAmount,
    }));
  });
}

export function groupCarrierBidsByLoad(bids) {
  const groups = new Map();

  bids.forEach((bid) => {
    const existing = groups.get(bid.loadId);
    if (existing) {
      existing.bids.push(bid);
      return;
    }

    groups.set(bid.loadId, {
      loadId: bid.loadId,
      loadNo: bid.loadNo,
      loadHref: `/loads/${bid.loadId}`,
      sourceBoards: [bid.sourceBoard],
      pickup: bid.pickup,
      dropoff: bid.dropoff,
      distanceMiles: bid.distanceMiles,
      equipment: bid.equipment,
      driverType: bid.driverType,
      postedRate: bid.postedRate,
      bids: [bid],
    });
  });

  return [...groups.values()].map((group) => ({
    ...group,
    sourceBoards: [...new Set(group.bids.map((bid) => bid.sourceBoard))],
  }));
}

export function getCarrierBidGroupForLoad(bids, loadId) {
  return groupCarrierBidsByLoad(bids).find((group) => group.loadId === loadId) || null;
}

function buildDefaultBids(item) {
  return [
    {
      carrierName: "Blue Mesa Freight LLC",
      bidAmount: item.price || 0,
      status: "under review",
      submittedAt: "Jun 14, 2026 · 08:00 AM",
      contactName: "Carrier Sales",
      contactPhone: "+1 (312) 555-0100",
      notes: `${item.driverType} ${item.equipment} offer received for this posted lane.`,
    },
  ];
}
