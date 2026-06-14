import type { LoadBoardItem, Posting, Stop } from "./loads";

export type CarrierBidStatus = "recommended" | "under review" | "rejected";

export interface CarrierBid {
  loadId: string;
  loadNo: string;
  sourceBoard: Posting["partner"];
  referenceNo: string;
  carrierName: string;
  bidAmount: number;
  postedRate?: number;
  marginToPosted: number | null;
  status: CarrierBidStatus;
  submittedAt: string;
  contactName: string;
  contactPhone: string;
  notes: string;
  pickup: Stop;
  dropoff: Stop;
  distanceMiles: number;
  equipment: string;
  driverType: string;
}

export function getCarrierBidsForBoardItems(items: LoadBoardItem[]): CarrierBid[];
export function groupCarrierBidsByLoad(bids: CarrierBid[]): Array<{
  loadId: string;
  loadNo: string;
  loadHref: string;
  sourceBoards: Array<Posting["partner"]>;
  pickup: Stop;
  dropoff: Stop;
  distanceMiles: number;
  equipment: string;
  driverType: string;
  postedRate?: number;
  bids: CarrierBid[];
}>;
export function getCarrierBidGroupForLoad(
  bids: CarrierBid[],
  loadId: string
): ReturnType<typeof groupCarrierBidsByLoad>[number] | null;
