import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ELEVENLABS_AI_VOICE_ID,
  DEFAULT_ELEVENLABS_DRIVER_VOICE_ID,
  ELEVENLABS_ADAM_VOICE_ID,
  buildElevenLabsSpeechPayload,
  buildElevenLabsSpeechUrl,
  getCallRecordingPersona,
  getElevenLabsVoiceId,
  normalizeCallRecordingRequest,
} from "../src/lib/callRecording.mjs";

test("call recording request validation trims valid AI or Driver text", () => {
  assert.deepEqual(
    normalizeCallRecordingRequest({
      speaker: "Driver",
      text: "  Loading is complete. ",
    }),
    {
      ok: true,
      value: {
        speaker: "Driver",
        text: "Loading is complete.",
      },
    }
  );

  assert.equal(normalizeCallRecordingRequest({ speaker: "Broker", text: "Hi" }).ok, false);
  assert.equal(normalizeCallRecordingRequest({ speaker: "AI", text: "" }).ok, false);
});

test("elevenlabs route helpers choose speaker-specific voice IDs", () => {
  const env = {
    ELEVENLABS_AI_VOICE_ID: "ai-voice",
    ELEVENLABS_DRIVER_VOICE_ID: "driver-voice",
    ELEVENLABS_VOICE_ID: "fallback-voice",
  };

  assert.equal(getElevenLabsVoiceId("AI", env), "ai-voice");
  assert.equal(getElevenLabsVoiceId("Driver", env), "driver-voice");
  assert.equal(
    getElevenLabsVoiceId("AI", { ELEVENLABS_VOICE_ID: "shared-voice" }),
    "shared-voice"
  );
  assert.equal(getElevenLabsVoiceId("AI", {}), DEFAULT_ELEVENLABS_AI_VOICE_ID);
  assert.equal(
    getElevenLabsVoiceId("Driver", {}),
    DEFAULT_ELEVENLABS_DRIVER_VOICE_ID
  );
  assert.notEqual(DEFAULT_ELEVENLABS_AI_VOICE_ID, DEFAULT_ELEVENLABS_DRIVER_VOICE_ID);
  assert.notEqual(DEFAULT_ELEVENLABS_DRIVER_VOICE_ID, ELEVENLABS_ADAM_VOICE_ID);
});

test("elevenlabs request helpers build the documented TTS request shape", () => {
  assert.equal(
    buildElevenLabsSpeechUrl("voice-123", "mp3_44100_128"),
    "https://api.elevenlabs.io/v1/text-to-speech/voice-123?output_format=mp3_44100_128"
  );
  const driverPersona = getCallRecordingPersona("Driver");

  assert.deepEqual(buildElevenLabsSpeechPayload("hello", "eleven_multilingual_v2", "Driver"), {
    text: "hello",
    model_id: "eleven_multilingual_v2",
    language_code: "en",
    voice_settings: driverPersona.voiceSettings,
  });
  assert.match(driverPersona.label, /Canadian Punjabi driver speaking English/);
});
