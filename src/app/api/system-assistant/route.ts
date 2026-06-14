import { NextResponse } from "next/server";
import { fetchLoad, fetchLoadBoard, fetchLoads } from "@/lib/loads";
import { answerSystemQuestion, buildSystemAssistantContext } from "@/lib/systemAssistant.mjs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const loadSummaries = await fetchLoads();
  const [loads, boardItems] = await Promise.all([
    Promise.all(loadSummaries.map((load) => fetchLoad(load.id))).then((items) =>
      items.filter((load) => load != null),
    ),
    fetchLoadBoard(),
  ]);

  const context = buildSystemAssistantContext({ loads, boardItems });
  const answer = answerSystemQuestion(question, context);

  return NextResponse.json(answer);
}
