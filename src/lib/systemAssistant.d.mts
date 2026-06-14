import type { Load, LoadBoardItem } from "./loads";

export interface SystemAssistantLink {
  href: string;
  label: string;
}

export interface SystemAssistantAnswer {
  text: string;
  links: SystemAssistantLink[];
}

export interface SystemAssistantContext {
  loads: Load[];
  boardItems: LoadBoardItem[];
  supplierOrders: unknown[];
  bids: unknown[];
  bidGroups: unknown[];
}

export function buildSystemAssistantContext(input?: {
  loads?: Load[];
  boardItems?: LoadBoardItem[];
}): SystemAssistantContext;

export function answerSystemQuestion(
  question: string,
  context: SystemAssistantContext,
): SystemAssistantAnswer;
