import type { Load } from "./loads";

export interface TrackingCall {
  title: string;
  purpose: string;
  transcript?: string;
  state: "scheduled" | "complete";
}

export interface TrackingUpdate {
  type: "gps" | "app" | "geofence" | "sms" | "signal" | "call";
  title: string;
  purpose: string;
  message: string;
  transcript?: string;
  state: "scheduled" | "complete";
}

export interface TrackingFrame {
  status: string;
  riskLevel: "normal" | "attention" | "watch" | "complete";
  progressPct: number;
  location: string;
  nextCheckpoint: string;
  eta: string;
  speedMph: number;
  accuracyFt: number;
  headingDeg: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  startCoordinates: {
    lat: number;
    lng: number;
  };
  pickupCoordinates: {
    lat: number;
    lng: number;
  };
  dropoffCoordinates: {
    lat: number;
    lng: number;
  };
  temperature: string | null;
  lastPingLabel: string;
  isComplete: boolean;
  insight: {
    title: string;
    summary: string;
    recommendedAction: string;
    customerUpdate: string;
  };
  updates: TrackingUpdate[];
  calls: TrackingCall[];
}

export function getTrackingFrame(
  load: Load,
  elapsedMs: number,
  durationMs?: number
): TrackingFrame;

export function getStopCoordinates(load: Load): {
  start: { lat: number; lng: number };
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
};

export function buildCallRecordingSegments(transcript: string): Array<{
  speaker: "AI" | "Driver";
  text: string;
}>;
