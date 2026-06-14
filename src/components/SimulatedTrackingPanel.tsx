"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import type { Load } from "@/lib/loads";
import {
  buildCallRecordingSegments,
  getTrackingFrame,
} from "@/lib/trackingSimulation.mjs";

const SIM_DURATION_MS = 95_000;
const MAP_ZOOM = 6;
const TILE_SIZE = 256;

type RecordingStatus = "idle" | "generating" | "elevenlabs" | "browser";

type CallRecordingSegment = {
  speaker: "AI" | "Driver";
  text: string;
};

type TrackingUpdate = ReturnType<typeof getTrackingFrame>["updates"][number];

type RecordingProgress = {
  percent: number;
  elapsedSeconds: number;
  durationSeconds: number;
};

type RecordingPlaylistItem = {
  audio: HTMLAudioElement;
  durationSeconds: number;
  effect?: DriverAudioEffect;
  objectUrl: string;
  segment: CallRecordingSegment;
};

type DriverAudioEffect = {
  cleanup: () => void;
  start: () => void;
  stop: () => void;
};

type PlaylistSeekRequest = {
  itemIndex: number;
  localSeconds: number;
};

type PlaybackController = {
  abortController: AbortController | null;
  activeItemIndex: number;
  audio: HTMLAudioElement | null;
  cancelled: boolean;
  cleanupNoise: (() => void) | null;
  playlist: RecordingPlaylistItem[];
  release: (() => void) | null;
  seekRequest: PlaylistSeekRequest | null;
  totalDurationSeconds: number;
};

export function SimulatedTrackingPanel({ load }: { load: Load }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [playingCallTitle, setPlayingCallTitle] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("idle");
  const [recordingProgress, setRecordingProgress] =
    useState<RecordingProgress>(createRecordingProgress());
  const playbackRef = useRef<PlaybackController>(createPlaybackController());

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Math.min(Date.now() - startedAt, SIM_DURATION_MS));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [load.id]);

  useEffect(() => {
    return () => {
      stopPlaybackController(playbackRef.current);
    };
  }, []);

  const frame = useMemo(
    () => getTrackingFrame(load, elapsedMs, SIM_DURATION_MS),
    [elapsedMs, load]
  );
  const completedUpdates = frame.updates.filter((update) => update.state === "complete").length;

  function stopRecording() {
    stopPlaybackController(playbackRef.current);
    setPlayingCallTitle(null);
    setRecordingStatus("idle");
    setRecordingProgress(createRecordingProgress());
  }

  function seekRecording(percent: number) {
    const controller = playbackRef.current;
    if (controller.playlist.length === 0 || controller.totalDurationSeconds <= 0) {
      return;
    }

    const targetSeconds = controller.totalDurationSeconds * (percent / 100);
    const target = getPlaylistSeekTarget(controller.playlist, targetSeconds);
    const audio = controller.audio;

    if (!audio || target.itemIndex !== controller.activeItemIndex) {
      controller.seekRequest = target;
      controller.release?.();
      setRecordingProgress(
        getPlaylistProgress(
          controller.playlist,
          target.itemIndex,
          target.localSeconds,
          controller.totalDurationSeconds
        )
      );
      return;
    }

    audio.currentTime = target.localSeconds;
    setRecordingProgress(
      getPlaylistProgress(
        controller.playlist,
        target.itemIndex,
        target.localSeconds,
        controller.totalDurationSeconds
      )
    );
  }

  async function playRecording(call: { title: string; transcript: string; state: "scheduled" | "complete" }) {
    if (call.state !== "complete") return;
    if (playingCallTitle === call.title) {
      stopRecording();
      return;
    }

    const segments = buildCallRecordingSegments(call.transcript);
    const controller = createPlaybackController();

    stopRecording();
    playbackRef.current = controller;
    setPlayingCallTitle(call.title);
    setRecordingStatus("generating");
    setRecordingProgress(createRecordingProgress());

    try {
      await playElevenLabsCall(
        segments,
        controller,
        () => setRecordingStatus("elevenlabs"),
        setRecordingProgress
      );
    } catch {
      if (controller.cancelled) return;
      setRecordingStatus("browser");
      await playBrowserSpeechSegments(segments, controller).catch(() => undefined);
    } finally {
      if (!controller.cancelled) {
        setPlayingCallTitle(null);
        setRecordingStatus("idle");
      }
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-gray-500">Live GPS Tracking</div>
          <h2 className="mt-1 text-base font-semibold text-gray-900">
            {frame.status}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
            Live telemetry
          </span>
          <RiskBadge riskLevel={frame.riskLevel} />
        </div>
      </div>

      <TrackingMap load={load} frame={frame} />

      <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Current location" value={frame.location} wide />
        <Metric label="ETA status" value={frame.eta} />
        <Metric label="Speed" value={`${frame.speedMph} mph`} />
        <Metric label="GPS accuracy" value={`${frame.accuracyFt} ft`} />
        <Metric label="Temperature" value={frame.temperature ?? "N/A"} />
      </dl>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">AI fulfillment insight</div>
          <h3 className="mt-1 text-sm font-semibold text-gray-900">{frame.insight.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{frame.insight.summary}</p>
          <div className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-800 ring-1 ring-orange-100">
            {frame.insight.recommendedAction}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">AI monitoring timeline</div>
              <h3 className="mt-1 text-sm font-semibold text-gray-900">
                {completedUpdates}/{frame.updates.length} updates complete
              </h3>
            </div>
            <div className="text-xs font-medium text-gray-500">Next: {frame.nextCheckpoint}</div>
          </div>
          <div className="mt-3 space-y-2">
            {frame.updates.map((update) => (
              <details key={update.title} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UpdateTypeIcon type={update.type} />
                        <div className="truncate text-sm font-medium text-gray-900">{update.title}</div>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500">{update.purpose}</div>
                    </div>
                    <UpdateStatusBadge update={update} />
                    {update.type === "call" && update.state === "complete" && update.transcript && (
                      <RecordingControl
                        isActive={playingCallTitle === update.title}
                        onSeek={seekRecording}
                        onToggle={(event) => {
                          event.preventDefault();
                          void playRecording({
                            title: update.title,
                            transcript: update.transcript || "",
                            state: update.state,
                          });
                        }}
                        progress={recordingProgress}
                        status={recordingStatus}
                      />
                    )}
                  </div>
                </summary>
                {update.state === "complete" && (
                  <p className="mt-2 border-t border-gray-200 pt-2 text-xs leading-5 text-gray-600">
                    {update.type === "call" && update.transcript
                      ? update.transcript
                      : update.message}
                  </p>
                )}
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function createPlaybackController(): PlaybackController {
  return {
    abortController: null,
    activeItemIndex: -1,
    audio: null,
    cancelled: false,
    cleanupNoise: null,
    playlist: [],
    release: null,
    seekRequest: null,
    totalDurationSeconds: 0,
  };
}

function createRecordingProgress(): RecordingProgress {
  return {
    percent: 0,
    elapsedSeconds: 0,
    durationSeconds: 0,
  };
}

function stopPlaybackController(controller: PlaybackController) {
  controller.cancelled = true;
  controller.abortController?.abort();
  controller.audio?.pause();
  controller.cleanupNoise?.();
  controller.release?.();
  cleanUpPlaylist(controller.playlist);

  controller.abortController = null;
  controller.activeItemIndex = -1;
  controller.audio = null;
  controller.cleanupNoise = null;
  controller.playlist = [];
  controller.release = null;
  controller.seekRequest = null;
  controller.totalDurationSeconds = 0;
  window.speechSynthesis?.cancel();
}

async function playElevenLabsCall(
  segments: CallRecordingSegment[],
  controller: PlaybackController,
  onAudioStart: () => void,
  onProgress: (progress: RecordingProgress) => void
) {
  const playlist = await createElevenLabsPlaylist(segments, controller);
  const totalDurationSeconds = playlist.reduce(
    (total, item) => total + item.durationSeconds,
    0
  );

  controller.playlist = playlist;
  controller.totalDurationSeconds = totalDurationSeconds;
  onAudioStart();
  onProgress({
    percent: 0,
    elapsedSeconds: 0,
    durationSeconds: totalDurationSeconds,
  });

  let itemIndex = 0;
  let localStartSeconds = 0;

  while (itemIndex < playlist.length && !controller.cancelled) {
    const seekRequest = controller.seekRequest;
    if (seekRequest) {
      itemIndex = seekRequest.itemIndex;
      localStartSeconds = seekRequest.localSeconds;
      controller.seekRequest = null;
    }

    const item = playlist[itemIndex];
    if (!item) break;

    controller.activeItemIndex = itemIndex;
    controller.audio = item.audio;
    item.audio.currentTime = Math.min(
      localStartSeconds,
      Math.max(0, item.durationSeconds - 0.05)
    );

    try {
      await waitForAudioPlayback(
        item.audio,
        controller,
        item,
        itemIndex,
        onProgress
      );
    } finally {
      controller.cleanupNoise?.();
      controller.cleanupNoise = null;

      if (controller.audio === item.audio) {
        controller.audio = null;
      }
    }

    if (!controller.seekRequest) {
      itemIndex += 1;
      localStartSeconds = 0;
    }
  }

  cleanUpPlaylist(playlist);
  controller.playlist = [];
}

async function createElevenLabsPlaylist(
  segments: CallRecordingSegment[],
  controller: PlaybackController
) {
  const playlist: RecordingPlaylistItem[] = [];

  try {
    for (const segment of segments) {
      if (controller.cancelled) return playlist;

      const audioBlob = await generateCallSegment(segment, controller);
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      audio.preload = "auto";
      const durationSeconds = await loadAudioDuration(audio, controller);

      playlist.push({
        audio,
        durationSeconds,
        objectUrl,
        segment,
      });
    }
  } catch (error) {
    cleanUpPlaylist(playlist);
    throw error;
  }

  return playlist;
}

async function generateCallSegment(
  segment: CallRecordingSegment,
  controller: PlaybackController
) {
  if (controller.cancelled) {
    throw new Error("Playback cancelled.");
  }

  const abortController = new AbortController();
  controller.abortController = abortController;

  const response = await fetch("/api/call-recordings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(segment),
    signal: abortController.signal,
  });

  controller.abortController = null;

  if (!response.ok) {
    throw new Error("Call recording generation failed.");
  }

  return response.blob();
}

function loadAudioDuration(
  audio: HTMLAudioElement,
  controller: PlaybackController
) {
  return new Promise<number>((resolve, reject) => {
    if (controller.cancelled) {
      resolve(0);
      return;
    }

    const cleanUp = () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("error", onError);
      controller.release = null;
    };
    const onLoadedMetadata = () => {
      cleanUp();
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onError = () => {
      cleanUp();
      reject(new Error("Generated audio metadata could not be loaded."));
    };

    controller.release = () => {
      cleanUp();
      resolve(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("error", onError);
    audio.load();
  });
}

function waitForAudioPlayback(
  audio: HTMLAudioElement,
  controller: PlaybackController,
  item: RecordingPlaylistItem,
  itemIndex: number,
  onProgress: (progress: RecordingProgress) => void
) {
  return new Promise<void>((resolve, reject) => {
    const updateProgress = () => {
      const elapsedSeconds = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;

      onProgress(
        getPlaylistProgress(
          controller.playlist,
          itemIndex,
          elapsedSeconds,
          controller.totalDurationSeconds
        )
      );
    };
    const cleanUp = () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("loadedmetadata", updateProgress);
      audio.removeEventListener("timeupdate", updateProgress);
      controller.release = null;
    };
    const onEnded = () => {
      updateProgress();
      cleanUp();
      resolve();
    };
    const onError = () => {
      cleanUp();
      reject(new Error("Generated audio playback failed."));
    };

    controller.release = () => {
      audio.pause();
      cleanUp();
      resolve();
    };

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("loadedmetadata", updateProgress);
    audio.addEventListener("timeupdate", updateProgress);

    if (item.segment.speaker === "Driver") {
      const effect = getDriverPhoneEffect(item);
      effect?.start();
      controller.cleanupNoise = effect?.stop ?? null;
    } else {
      audio.volume = 1;
      audio.playbackRate = 1;
    }

    audio.play().then(updateProgress).catch(onError);
  });
}

function getPlaylistSeekTarget(
  playlist: RecordingPlaylistItem[],
  targetSeconds: number
): PlaylistSeekRequest {
  const clampedTargetSeconds = Math.max(
    0,
    Math.min(
      targetSeconds,
      playlist.reduce((total, item) => total + item.durationSeconds, 0)
    )
  );
  let elapsedSeconds = 0;

  for (let itemIndex = 0; itemIndex < playlist.length; itemIndex += 1) {
    const item = playlist[itemIndex];
    const nextElapsedSeconds = elapsedSeconds + item.durationSeconds;

    if (clampedTargetSeconds <= nextElapsedSeconds || itemIndex === playlist.length - 1) {
      return {
        itemIndex,
        localSeconds: Math.max(0, clampedTargetSeconds - elapsedSeconds),
      };
    }

    elapsedSeconds = nextElapsedSeconds;
  }

  return {
    itemIndex: 0,
    localSeconds: 0,
  };
}

function getPlaylistProgress(
  playlist: RecordingPlaylistItem[],
  itemIndex: number,
  localSeconds: number,
  totalDurationSeconds: number
): RecordingProgress {
  const elapsedBeforeItem = playlist
    .slice(0, Math.max(0, itemIndex))
    .reduce((total, item) => total + item.durationSeconds, 0);
  const elapsedSeconds = Math.max(
    0,
    Math.min(totalDurationSeconds, elapsedBeforeItem + localSeconds)
  );

  return {
    percent: totalDurationSeconds > 0 ? (elapsedSeconds / totalDurationSeconds) * 100 : 0,
    elapsedSeconds,
    durationSeconds: totalDurationSeconds,
  };
}

function cleanUpPlaylist(playlist: RecordingPlaylistItem[]) {
  playlist.forEach((item) => {
    item.audio.pause();
    item.effect?.cleanup();
    URL.revokeObjectURL(item.objectUrl);
  });
}

function playBrowserSpeechSegments(
  segments: CallRecordingSegment[],
  controller: PlaybackController
) {
  return new Promise<void>((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis is unavailable."));
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    const aiVoice = voices.find((voice) => voice.lang.startsWith("en")) ?? null;
    const driverVoice =
      voices.find(
        (voice) => voice.lang.startsWith("en") && voice.name !== aiVoice?.name
      ) ?? aiVoice;
    let segmentIndex = 0;
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      controller.release = null;
      resolve();
    };

    const fail = () => {
      if (controller.cancelled) {
        finish();
        return;
      }

      controller.release = null;
      reject(new Error("Browser speech playback failed."));
    };

    const speakNext = () => {
      if (controller.cancelled) {
        finish();
        return;
      }

      const segment = segments[segmentIndex];
      if (!segment) {
        finish();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(segment.text);
      utterance.rate = segment.speaker === "AI" ? 0.98 : 0.94;
      utterance.pitch = segment.speaker === "AI" ? 1.04 : 0.88;
      utterance.voice = segment.speaker === "AI" ? aiVoice : driverVoice;
      utterance.onend = () => {
        segmentIndex += 1;
        speakNext();
      };
      utterance.onerror = fail;
      window.speechSynthesis.speak(utterance);
    };

    controller.release = finish;
    window.speechSynthesis.cancel();
    speakNext();
  });
}

function getDriverPhoneEffect(item: RecordingPlaylistItem) {
  if (item.effect) return item.effect;

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioContextCtor) return null;

  const audioContext = new AudioContextCtor();
  let audioSource: MediaElementAudioSourceNode;

  try {
    audioSource = audioContext.createMediaElementSource(item.audio);
  } catch {
    return null;
  }

  const noiseBuffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * 3,
    audioContext.sampleRate
  );
  const channel = noiseBuffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * 0.7;
  }

  const crackleBuffer = audioContext.createBuffer(
    1,
    audioContext.sampleRate * 3,
    audioContext.sampleRate
  );
  const crackleChannel = crackleBuffer.getChannelData(0);

  for (let index = 0; index < crackleChannel.length; index += 1) {
    const isPop = Math.random() > 0.996;
    crackleChannel[index] = isPop ? (Math.random() * 2 - 1) * 0.85 : 0;
  }

  const highpass = audioContext.createBiquadFilter();
  const lowpass = audioContext.createBiquadFilter();
  const compressor = audioContext.createDynamicsCompressor();
  const grit = audioContext.createWaveShaper();
  const voiceGain = audioContext.createGain();
  const noiseSource = audioContext.createBufferSource();
  const noiseFilter = audioContext.createBiquadFilter();
  const noiseGain = audioContext.createGain();
  const crackleSource = audioContext.createBufferSource();
  const crackleGain = audioContext.createGain();
  const humOscillator = audioContext.createOscillator();
  const humGain = audioContext.createGain();

  highpass.type = "highpass";
  highpass.frequency.value = 280;
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3100;
  compressor.threshold.value = -31;
  compressor.knee.value = 14;
  compressor.ratio.value = 7;
  compressor.attack.value = 0.005;
  compressor.release.value = 0.2;
  grit.curve = createPhoneDistortionCurve(18);
  grit.oversample = "2x";
  voiceGain.gain.value = 1.1;

  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 1700;
  noiseGain.gain.value = 0;
  crackleSource.buffer = crackleBuffer;
  crackleSource.loop = true;
  crackleGain.gain.value = 0;
  humOscillator.type = "sine";
  humOscillator.frequency.value = 83;
  humGain.gain.value = 0;

  audioSource.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(grit);
  grit.connect(voiceGain);
  voiceGain.connect(audioContext.destination);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  crackleSource.connect(crackleGain);
  crackleGain.connect(audioContext.destination);
  humOscillator.connect(humGain);
  humGain.connect(audioContext.destination);

  noiseSource.start();
  crackleSource.start();
  humOscillator.start();

  item.audio.playbackRate = 0.985;
  let cleanedUp = false;

  const effect = {
    cleanup: () => {
      if (cleanedUp) return;
      cleanedUp = true;

      try {
        noiseSource.stop();
        crackleSource.stop();
        humOscillator.stop();
      } catch {
        // Already stopped.
      }

      item.audio.playbackRate = 1;
      void audioContext.close();
    },
    start: () => {
      if (cleanedUp) return;

      void audioContext.resume();
      item.audio.playbackRate = 0.985;
      noiseGain.gain.setTargetAtTime(0.035, audioContext.currentTime, 0.08);
      crackleGain.gain.setTargetAtTime(0.026, audioContext.currentTime, 0.08);
      humGain.gain.setTargetAtTime(0.012, audioContext.currentTime, 0.1);
    },
    stop: () => {
      if (cleanedUp) return;

      noiseGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
      crackleGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
      humGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
    },
  };

  item.effect = effect;
  return effect;
}

function createPhoneDistortionCurve(amount: number) {
  const samples = 256;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;

  for (let index = 0; index < samples; index += 1) {
    const x = (index * 2) / samples - 1;
    curve[index] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
}

function RecordingControl({
  isActive,
  onSeek,
  onToggle,
  progress,
  status,
}: {
  isActive: boolean;
  onSeek: (percent: number) => void;
  onToggle: (event: MouseEvent<HTMLButtonElement>) => void;
  progress: RecordingProgress;
  status: RecordingStatus;
}) {
  return (
    <div
      className={`flex h-8 items-center rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-200 ${
        isActive ? "w-56 gap-2 px-1.5" : "w-8 justify-center"
      }`}
      onClick={(event) => event.preventDefault()}
    >
      <button
        aria-label={isActive ? "Stop recording" : "Play recording"}
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full transition ${
          isActive
            ? "bg-orange-500 text-white"
            : "text-gray-500 hover:bg-orange-50 hover:text-orange-700"
        }`}
        onClick={onToggle}
        type="button"
      >
        {isActive ? <StopIcon /> : <SpeakerIcon />}
      </button>
      {isActive && (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            aria-label="Recording scrubber"
            className="h-1.5 min-w-0 flex-1 accent-orange-500"
            disabled={status === "generating"}
            max="100"
            min="0"
            onChange={(event) => onSeek(Number(event.currentTarget.value))}
            type="range"
            value={Math.round(progress.percent)}
          />
          <span className="w-16 text-right tabular-nums text-[10px] font-medium text-gray-500">
            {status === "generating"
              ? "..."
              : `${formatPlaybackTime(progress.elapsedSeconds)}/${formatPlaybackTime(progress.durationSeconds)}`}
          </span>
        </div>
      )}
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15 9.5a4 4 0 0 1 0 5" />
      <path d="M18 7a8 8 0 0 1 0 10" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M7 7h10v10H7z" />
    </svg>
  );
}

function formatPlaybackTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function UpdateTypeIcon({ type }: { type: TrackingUpdate["type"] }) {
  const styles = {
    app: "bg-slate-100 text-slate-600 ring-slate-200",
    call: "bg-red-50 text-red-700 ring-red-200",
    geofence: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    gps: "bg-sky-50 text-sky-700 ring-sky-200",
    signal: "bg-amber-50 text-amber-700 ring-amber-200",
    sms: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  };

  return (
    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 ${styles[type]}`}>
      {type === "gps" && <GpsIcon />}
      {type === "app" && <AppIcon />}
      {type === "geofence" && <GeofenceIcon />}
      {type === "sms" && <SmsIcon />}
      {type === "signal" && <SignalIcon />}
      {type === "call" && <PhoneIcon />}
    </span>
  );
}

function UpdateStatusBadge({ update }: { update: TrackingUpdate }) {
  const isComplete = update.state === "complete";
  const styles = update.type === "call"
    ? isComplete
      ? "bg-red-50 text-red-700 ring-red-200"
      : "bg-red-50 text-red-600 ring-red-100"
    : isComplete
      ? "bg-green-100 text-green-700 ring-green-200"
      : "bg-gray-100 text-gray-600 ring-gray-200";
  const label = update.type === "call"
    ? isComplete
      ? "Escalated"
      : "Escalating"
    : isComplete
      ? "Complete"
      : "Pending";

  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}>
      {label}
    </span>
  );
}

function GpsIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 21s7-4.6 7-11a7 7 0 0 0-14 0c0 6.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function AppIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="18" rx="2" width="11" x="6.5" y="3" />
      <path d="M10 17h4" />
    </svg>
  );
}

function GeofenceIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 9V5h4" />
      <path d="M16 5h4v4" />
      <path d="M20 15v4h-4" />
      <path d="M8 19H4v-4" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function SmsIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 6h14v9H8l-3 3V6Z" />
      <path d="M8 10h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 8.8a15 15 0 0 1 20 0" />
      <path d="M5 12a10.5 10.5 0 0 1 14 0" />
      <path d="M8.5 15.3a5.5 5.5 0 0 1 7 0" />
      <path d="m9 20 6-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 16.9v2.5a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3 4.2 2 2 0 0 1 5 2h2.6a2 2 0 0 1 2 1.7l.4 2.6a2 2 0 0 1-.6 1.8L8.2 9.3a14 14 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 1.8-.6l2.6.4a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function TrackingMap({
  load,
  frame,
}: {
  load: Load;
  frame: ReturnType<typeof getTrackingFrame>;
}) {
  const tiles = getVisibleTiles(frame.coordinates, MAP_ZOOM);
  const coordinateLabel = `${frame.coordinates.lat.toFixed(4)}, ${frame.coordinates.lng.toFixed(4)}`;

  return (
    <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 lg:grid-cols-[minmax(0,1fr)_250px]">
      <div className="relative h-80 overflow-hidden rounded-lg border border-gray-200 bg-slate-100 shadow-inner">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="absolute h-64 w-64 bg-cover bg-center"
            style={{
              backgroundImage: `url(${tile.url})`,
              left: `calc(50% + ${tile.left}px)`,
              top: `calc(50% + ${tile.top}px)`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-gray-900/10" />

        <RouteSegment center={frame.coordinates} from={frame.startCoordinates} to={frame.pickupCoordinates} />
        <RouteSegment center={frame.coordinates} from={frame.pickupCoordinates} to={frame.dropoffCoordinates} />
        {frame.progressPct <= 24 ? (
          <RouteSegment active center={frame.coordinates} from={frame.startCoordinates} to={frame.coordinates} />
        ) : (
          <>
            <RouteSegment active center={frame.coordinates} from={frame.startCoordinates} to={frame.pickupCoordinates} />
            <RouteSegment active center={frame.coordinates} from={frame.pickupCoordinates} to={frame.coordinates} />
          </>
        )}

        <MapMarker
          center={frame.coordinates}
          coordinate={frame.startCoordinates}
          label={load.currentLocation ? `Start: ${load.currentLocation}` : "Start"}
          tone="start"
        />
        <MapMarker
          center={frame.coordinates}
          coordinate={frame.pickupCoordinates}
          label={`${load.pickup.city}, ${load.pickup.state}`}
          tone="pickup"
        />
        <MapMarker
          center={frame.coordinates}
          coordinate={frame.dropoffCoordinates}
          label={`${load.dropoff.city}, ${load.dropoff.state}`}
          tone="dropoff"
        />
        <VehicleMarker center={frame.coordinates} coordinate={frame.coordinates} />

        <div className="absolute bottom-3 left-3 right-3 rounded-md border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
            <span>{frame.progressPct}% route progress</span>
            <span>Last ping {frame.lastPingLabel}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-700"
              style={{ width: `${frame.progressPct}%` }}
            />
          </div>
        </div>

        <a
          className="absolute bottom-20 right-3 rounded bg-white/90 px-2 py-1 text-[10px] text-gray-500 shadow-sm"
          href="https://www.openstreetmap.org/copyright"
          rel="noreferrer"
          target="_blank"
        >
          © OpenStreetMap
        </a>
      </div>

      <div className="space-y-3">
        <StopSummary label="Pickup" city={load.pickup.city} state={load.pickup.state} />
        <StopSummary label="Drop-off" city={load.dropoff.city} state={load.dropoff.state} />
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-xs uppercase tracking-wide text-gray-500">GPS fix</div>
          <div className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Coordinates</span>
              <span className="font-medium text-gray-900">{coordinateLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Heading</span>
              <span className="font-medium text-gray-900">{frame.headingDeg}°</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Distance</span>
              <span className="font-medium text-gray-900">{Math.round(load.distanceMiles).toLocaleString()} mi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VehicleMarker({
  center,
  coordinate,
}: {
  center: Coordinates;
  coordinate: Coordinates;
}) {
  const offset = pixelOffset(center, coordinate, MAP_ZOOM);

  return (
    <div
      className="absolute transition-all duration-700"
      style={{
        left: `calc(50% + ${offset.x}px)`,
        top: `calc(50% + ${offset.y}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-orange-500/20" />
        <div className="relative h-4 w-4 rounded-full bg-orange-500 ring-4 ring-white shadow-md" />
        <div className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-800 shadow-sm">
          Driver GPS
        </div>
      </div>
    </div>
  );
}

function RouteSegment({
  center,
  from,
  to,
  active,
}: {
  center: Coordinates;
  from: Coordinates;
  to: Coordinates;
  active?: boolean;
}) {
  const start = pixelOffset(center, from, MAP_ZOOM);
  const end = pixelOffset(center, to, MAP_ZOOM);
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  const angle = Math.atan2(end.y - start.y, end.x - start.x);

  if (length < 1) return null;

  return (
    <div
      className={`absolute rounded-full ${
        active
          ? "z-10 h-1.5 bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]"
          : "z-0 h-1 bg-slate-600/40"
      }`}
      style={{
        left: `calc(50% + ${start.x}px)`,
        top: `calc(50% + ${start.y}px)`,
        transform: `translateY(-50%) rotate(${angle}rad)`,
        transformOrigin: "left center",
        width: `${length}px`,
      }}
    />
  );
}

function MapMarker({
  center,
  coordinate,
  label,
  tone,
}: {
  center: Coordinates;
  coordinate: Coordinates;
  label: string;
  tone: "start" | "pickup" | "dropoff";
}) {
  const offset = pixelOffset(center, coordinate, MAP_ZOOM);
  const colors = {
    start: "bg-slate-700",
    pickup: "bg-orange-600",
    dropoff: "bg-green-600",
  };
  const labelPosition = {
    start: "left-4 top-1/2 -translate-y-1/2",
    pickup: "left-4 top-6",
    dropoff: "right-4 top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className="absolute z-20 transition-all duration-700"
      style={{
        left: `calc(50% + ${offset.x}px)`,
        top: `calc(50% + ${offset.y}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className={`h-3 w-3 rounded-full border-2 border-white shadow ${colors[tone]}`} />
      <span className={`absolute ${labelPosition[tone]} whitespace-nowrap rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 shadow-sm`}>
        {label}
      </span>
    </div>
  );
}

function StopSummary({
  label,
  city,
  state,
  align,
}: {
  label: string;
  city: string;
  state: string;
  align?: "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="font-medium text-gray-900">
        {city}, {state}
      </div>
    </div>
  );
}

type Coordinates = {
  lat: number;
  lng: number;
};

function getVisibleTiles(center: Coordinates, zoom: number) {
  const centerPixel = project(center, zoom);
  const centerTileX = Math.floor(centerPixel.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPixel.y / TILE_SIZE);
  const maxTile = 2 ** zoom;
  const tiles = [];

  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 2; dy += 1) {
      const tileX = centerTileX + dx;
      const tileY = centerTileY + dy;
      if (tileY < 0 || tileY >= maxTile) continue;
      const wrappedX = ((tileX % maxTile) + maxTile) % maxTile;

      tiles.push({
        key: `${wrappedX}-${tileY}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        left: tileX * TILE_SIZE - centerPixel.x,
        top: tileY * TILE_SIZE - centerPixel.y,
      });
    }
  }

  return tiles;
}

function pixelOffset(center: Coordinates, coordinate: Coordinates, zoom: number) {
  const centerPixel = project(center, zoom);
  const coordinatePixel = project(coordinate, zoom);

  return {
    x: coordinatePixel.x - centerPixel.x,
    y: coordinatePixel.y - centerPixel.y,
  };
}

function project(coordinate: Coordinates, zoom: number) {
  const sinLat = Math.sin((coordinate.lat * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((coordinate.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function Metric({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 ${wide ? "col-span-2 md:col-span-1" : ""}`}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium text-gray-900" title={value}>
        {value}
      </dd>
    </div>
  );
}

function RiskBadge({ riskLevel }: { riskLevel: "normal" | "attention" | "watch" | "complete" }) {
  const styles = {
    normal: "bg-sky-50 text-sky-700 ring-sky-200",
    attention: "bg-amber-50 text-amber-700 ring-amber-200",
    watch: "bg-orange-50 text-orange-700 ring-orange-200",
    complete: "bg-green-50 text-green-700 ring-green-200",
  };

  const labels = {
    normal: "On track",
    attention: "Attention",
    watch: "Watch",
    complete: "Complete",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${styles[riskLevel]}`}>
      {labels[riskLevel]}
    </span>
  );
}
