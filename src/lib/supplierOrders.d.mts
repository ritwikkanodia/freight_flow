import type { Load } from "./loads";

export type SupplierOrderStatus = "order received" | "accepted" | "rejected";

export interface SupplierOrderItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SupplierOrder {
  id: string;
  loadId: string;
  supplierName: string;
  status: SupplierOrderStatus;
  shipment: {
    commodityType: string;
    palletCount: number;
    weightLbs: number;
  };
  dispatch: {
    time: string;
    place: string;
  };
  order: {
    date: string;
    time: string;
    items: SupplierOrderItem[];
    totalPrice: number;
  };
  tender: {
    referenceNo: string;
    tenderNo: string;
    mode: string;
    equipment: string;
    temperatureF: number | null;
    paymentTerms: string;
    responseBy: string;
  };
}

export function getSupplierOrdersForLoads(loads: Load[]): SupplierOrder[];
export function findSupplierOrderById(loads: Load[], orderId: string): SupplierOrder | null;
export function getSupplierOrderLoadHref(order: SupplierOrder): string;
