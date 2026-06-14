import {
  buildElevenLabsSpeechPayload,
  buildElevenLabsSpeechUrl,
  getElevenLabsModelId,
  getElevenLabsOutputFormat,
  getElevenLabsVoiceId,
  normalizeCallRecordingRequest,
} from "@/lib/callRecording.mjs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const normalized = normalizeCallRecordingRequest(body);
  if (!normalized.ok) {
    return Response.json({ error: normalized.error }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY is not configured." },
      { status: 501 }
    );
  }

  const voiceId = getElevenLabsVoiceId(normalized.value.speaker);
  const modelId = getElevenLabsModelId();
  const outputFormat = getElevenLabsOutputFormat();
  const upstreamUrl = buildElevenLabsSpeechUrl(voiceId, outputFormat);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(
        buildElevenLabsSpeechPayload(
          normalized.value.text,
          modelId,
          normalized.value.speaker
        )
      ),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "ElevenLabs request failed." },
      { status: 502 }
    );
  }

  if (!upstreamResponse.ok) {
    return Response.json(
      {
        error: "ElevenLabs could not generate the recording.",
        detail: await getSafeUpstreamError(upstreamResponse),
      },
      { status: 502 }
    );
  }

  return new Response(await upstreamResponse.arrayBuffer(), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type":
        upstreamResponse.headers.get("content-type") || "audio/mpeg",
    },
  });
}

async function getSafeUpstreamError(response: Response) {
  try {
    return (await response.text()).slice(0, 280);
  } catch {
    return `HTTP ${response.status}`;
  }
}
