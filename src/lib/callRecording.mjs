export const DEFAULT_ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
export const DEFAULT_ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";
export const DEFAULT_ELEVENLABS_AI_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
export const DEFAULT_ELEVENLABS_DRIVER_VOICE_ID = "iP95p4xoKVk53GoZ742B";
export const ELEVENLABS_ADAM_VOICE_ID = "pNInz6obpgDQGcFmaJgB";
export const DEFAULT_ELEVENLABS_VOICE_ID = DEFAULT_ELEVENLABS_AI_VOICE_ID;
export const MAX_RECORDING_TEXT_LENGTH = 1200;

export const CALL_RECORDING_PERSONAS = {
  AI: {
    label: "Middle-aged North American woman AI dispatcher",
    defaultVoiceId: DEFAULT_ELEVENLABS_AI_VOICE_ID,
    languageCode: "en",
    voiceSettings: {
      stability: 0.72,
      similarity_boost: 0.78,
      style: 0.18,
      use_speaker_boost: true,
      speed: 0.96,
    },
  },
  Driver: {
    label: "Canadian Punjabi driver speaking English",
    defaultVoiceId: DEFAULT_ELEVENLABS_DRIVER_VOICE_ID,
    languageCode: "en",
    voiceSettings: {
      stability: 0.48,
      similarity_boost: 0.7,
      style: 0.42,
      use_speaker_boost: true,
      speed: 0.94,
    },
  },
};

export function normalizeCallRecordingRequest(body) {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: "Request body must be a JSON object.",
    };
  }

  const speaker = body.speaker;
  if (speaker !== "AI" && speaker !== "Driver") {
    return {
      ok: false,
      error: "Speaker must be AI or Driver.",
    };
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return {
      ok: false,
      error: "Text is required.",
    };
  }

  if (text.length > MAX_RECORDING_TEXT_LENGTH) {
    return {
      ok: false,
      error: `Text must be ${MAX_RECORDING_TEXT_LENGTH} characters or fewer.`,
    };
  }

  return {
    ok: true,
    value: {
      speaker,
      text,
    },
  };
}

export function getElevenLabsVoiceId(speaker, env = process.env) {
  if (speaker === "Driver") {
    return (
      env.ELEVENLABS_DRIVER_VOICE_ID ||
      env.ELEVENLABS_VOICE_ID ||
      CALL_RECORDING_PERSONAS.Driver.defaultVoiceId
    );
  }

  return (
    env.ELEVENLABS_AI_VOICE_ID ||
    env.ELEVENLABS_VOICE_ID ||
    CALL_RECORDING_PERSONAS.AI.defaultVoiceId
  );
}

export function getCallRecordingPersona(speaker) {
  return CALL_RECORDING_PERSONAS[speaker];
}

export function getElevenLabsModelId(env = process.env) {
  return env.ELEVENLABS_MODEL_ID || DEFAULT_ELEVENLABS_MODEL_ID;
}

export function getElevenLabsOutputFormat(env = process.env) {
  return env.ELEVENLABS_OUTPUT_FORMAT || DEFAULT_ELEVENLABS_OUTPUT_FORMAT;
}

export function buildElevenLabsSpeechUrl(
  voiceId,
  outputFormat = DEFAULT_ELEVENLABS_OUTPUT_FORMAT
) {
  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
  url.searchParams.set("output_format", outputFormat);
  return url.toString();
}

export function buildElevenLabsSpeechPayload(
  text,
  modelId = DEFAULT_ELEVENLABS_MODEL_ID,
  speaker = "AI"
) {
  const persona = getCallRecordingPersona(speaker);

  return {
    text,
    model_id: modelId,
    language_code: persona.languageCode,
    voice_settings: persona.voiceSettings,
  };
}
