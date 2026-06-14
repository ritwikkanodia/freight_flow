export const DEFAULT_ELEVENLABS_MODEL_ID: string;
export const DEFAULT_ELEVENLABS_OUTPUT_FORMAT: string;
export const DEFAULT_ELEVENLABS_AI_VOICE_ID: string;
export const DEFAULT_ELEVENLABS_DRIVER_VOICE_ID: string;
export const ELEVENLABS_ADAM_VOICE_ID: string;
export const DEFAULT_ELEVENLABS_VOICE_ID: string;
export const MAX_RECORDING_TEXT_LENGTH: number;

export type CallRecordingSpeaker = "AI" | "Driver";

export interface CallRecordingPersona {
  label: string;
  defaultVoiceId: string;
  languageCode: "en";
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
    speed: number;
  };
}

export const CALL_RECORDING_PERSONAS: Record<
  CallRecordingSpeaker,
  CallRecordingPersona
>;

export type NormalizedCallRecordingRequest =
  | {
      ok: true;
      value: {
        speaker: CallRecordingSpeaker;
        text: string;
      };
    }
  | {
      ok: false;
      error: string;
    };

export function normalizeCallRecordingRequest(
  body: unknown
): NormalizedCallRecordingRequest;

export function getElevenLabsVoiceId(
  speaker: CallRecordingSpeaker,
  env?: NodeJS.ProcessEnv
): string;

export function getCallRecordingPersona(
  speaker: CallRecordingSpeaker
): CallRecordingPersona;

export function getElevenLabsModelId(env?: NodeJS.ProcessEnv): string;

export function getElevenLabsOutputFormat(env?: NodeJS.ProcessEnv): string;

export function buildElevenLabsSpeechUrl(
  voiceId: string,
  outputFormat?: string
): string;

export function buildElevenLabsSpeechPayload(
  text: string,
  modelId?: string,
  speaker?: CallRecordingSpeaker
): {
  text: string;
  model_id: string;
  language_code: "en";
  voice_settings: CallRecordingPersona["voiceSettings"];
};
