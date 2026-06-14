const ORDER_FIXTURES = {
  "236568": {
    status: "accepted",
    commodityType: "Refrigerated produce",
    palletCount: 22,
    orderDate: "Jun 13, 2026",
    orderTime: "09:18 AM CDT",
    items: [
      { sku: "BV-CR-40", description: "Crisp romaine cartons", quantity: 420, unitPrice: 42 },
      { sku: "BV-GR-24", description: "Green leaf cartons", quantity: 360, unitPrice: 38 },
      { sku: "BV-MX-18", description: "Mixed vegetable cartons", quantity: 520, unitPrice: 31 },
    ],
    tender: {
      tenderNo: "TDR-2026-0613-018",
      mode: "FTL Reefer",
      equipment: "53 ft reefer",
      temperatureF: 33,
      paymentTerms: "Net 30",
      responseBy: "Jun 13, 2026 · 10:00 AM CDT",
    },
  },
  "236564": {
    status: "rejected",
    commodityType: "Dry grocery",
    palletCount: 14,
    orderDate: "Jun 13, 2026",
    orderTime: "08:42 AM CDT",
    items: [
      { sku: "MV-RC-12", description: "Retail canned goods", quantity: 280, unitPrice: 18 },
      { sku: "MV-SP-08", description: "Shelf-stable sauces", quantity: 210, unitPrice: 24 },
    ],
    tender: {
      tenderNo: "TDR-2026-0613-011",
      mode: "FTL Dry Van",
      equipment: "53 ft dry van",
      temperatureF: null,
      paymentTerms: "Net 21",
      responseBy: "Jun 13, 2026 · 09:30 AM CDT",
    },
  },
  "236548": {
    status: "order received",
    commodityType: "Fresh berries",
    palletCount: 20,
    orderDate: "Jun 14, 2026",
    orderTime: "07:50 AM CDT",
    items: [
      { sku: "RL-ST-12", description: "Strawberry clamshells", quantity: 600, unitPrice: 29 },
      { sku: "RL-BB-06", description: "Blueberry flats", quantity: 460, unitPrice: 34 },
    ],
    tender: {
      tenderNo: "TDR-2026-0614-006",
      mode: "FTL Reefer",
      equipment: "53 ft reefer",
      temperatureF: 34,
      paymentTerms: "Net 30",
      responseBy: "Jun 14, 2026 · 09:00 AM CDT",
    },
  },
};

export function getSupplierOrdersForLoads(loads) {
  return loads.map((load) => {
    const fixture = ORDER_FIXTURES[load.id] || buildDefaultFixture(load);
    const items = fixture.items.map((item) => ({
      ...item,
      lineTotal: item.quantity * item.unitPrice,
    }));

    return {
      id: `SO-${load.customerLoadNo || load.loadNo}`,
      loadId: load.id,
      supplierName: load.customer,
      status: fixture.status,
      shipment: {
        commodityType: fixture.commodityType,
        palletCount: fixture.palletCount,
        weightLbs: load.weightLbs,
      },
      dispatch: {
        time: load.pickup.dateTime,
        place: `${load.pickup.city}, ${load.pickup.state}`,
      },
      order: {
        date: fixture.orderDate,
        time: fixture.orderTime,
        items,
        totalPrice: items.reduce((total, item) => total + item.lineTotal, 0),
      },
      tender: {
        ...fixture.tender,
        referenceNo: load.customerLoadNo || load.loadNo,
      },
    };
  });
}

export function findSupplierOrderById(loads, orderId) {
  return getSupplierOrdersForLoads(loads).find((order) => order.id === orderId) || null;
}

export function getSupplierOrderLoadHref(order) {
  return `/loads/${order.loadId}`;
}

function buildDefaultFixture(load) {
  return {
    status: load.status === "Cancelled" ? "rejected" : "accepted",
    commodityType: load.temperatureMode ? "Temperature-controlled freight" : "Packaged freight",
    palletCount: Math.max(8, Math.round(load.weightLbs / 1900)),
    orderDate: "Jun 14, 2026",
    orderTime: "08:15 AM",
    items: [
      { sku: `${load.customer.slice(0, 2).toUpperCase()}-GEN-01`, description: "Customer order line", quantity: 1, unitPrice: load.customerRate },
    ],
    tender: {
      tenderNo: `TDR-${load.loadNo}`,
      mode: `${load.loadSize?.includes("FTL") ? "FTL" : "Partial"} ${load.equipment}`,
      equipment: load.equipment,
      temperatureF: load.temperatureF ?? null,
      paymentTerms: "Net 30",
      responseBy: load.pickup.dateTime,
    },
  };
}
