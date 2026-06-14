import type { Load } from "./loads";
import type { TrackingFrame } from "./trackingSimulation.mjs";

export type LoadLifecycleState = "done" | "current" | "pending" | "blocked";

export interface LoadLifecycleStep {
  id: string;
  label: string;
  description: string;
  state: LoadLifecycleState;
}

export const LOAD_LIFECYCLE_STEPS: Array<Omit<LoadLifecycleStep, "state">>;

export function buildLoadLifecycle(
  load: Load,
  trackingFrame?: TrackingFrame | null
): LoadLifecycleStep[];
