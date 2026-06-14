const MAX_QUERY_THREADS = 30;

export function createQueryThread({ id, title, createdAt = new Date().toISOString() } = {}) {
  const normalizedTitle = String(title || "Assistant thread").trim();

  return {
    id: id || `thread-${createdAt}-${hashString(normalizedTitle)}`,
    title: normalizedTitle,
    turns: [],
    latestQuestion: "",
    latestAnswer: "",
    createdAt,
    updatedAt: createdAt,
  };
}

export function appendThreadTurn(thread, turn) {
  const createdAt = typeof turn?.createdAt === "string" ? turn.createdAt : new Date().toISOString();
  const question = String(turn?.question || "").trim();
  const answer = String(turn?.answer || "").trim();
  const links = Array.isArray(turn?.links) ? turn.links : [];

  return {
    ...sanitizeThread(thread),
    turns: [
      ...sanitizeThread(thread).turns,
      {
        id: `turn-${createdAt}-${hashString(`${question}:${answer}`)}`,
        question,
        answer,
        links,
        createdAt,
      },
    ],
    latestQuestion: question,
    latestAnswer: answer,
    updatedAt: createdAt,
  };
}

export function upsertQueryThread(threads, thread, maxThreads = MAX_QUERY_THREADS) {
  const sanitizedThread = sanitizeThread(thread);
  const remaining = sanitizeQueryThreads(threads).filter((item) => item.id !== sanitizedThread.id);

  return [sanitizedThread, ...remaining]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxThreads);
}

export function sanitizeQueryThreads(threads) {
  if (!Array.isArray(threads)) return [];
  return threads.map(sanitizeThread).filter((thread) => thread.id && thread.title);
}

function sanitizeThread(thread) {
  const createdAt = typeof thread?.createdAt === "string" ? thread.createdAt : new Date().toISOString();
  const turns = Array.isArray(thread?.turns)
    ? thread.turns
        .filter((turn) => turn && typeof turn.question === "string" && typeof turn.answer === "string")
        .map((turn) => ({
          id: typeof turn.id === "string" ? turn.id : `turn-${hashString(turn.question)}`,
          question: turn.question,
          answer: turn.answer,
          links: Array.isArray(turn.links) ? turn.links : [],
          createdAt: typeof turn.createdAt === "string" ? turn.createdAt : createdAt,
        }))
    : [];
  const latestTurn = turns[turns.length - 1];

  return {
    id: typeof thread?.id === "string" ? thread.id : `thread-${createdAt}-${hashString(thread?.title || "")}`,
    title: typeof thread?.title === "string" ? thread.title : latestTurn?.question || "Assistant thread",
    turns,
    latestQuestion: typeof thread?.latestQuestion === "string" ? thread.latestQuestion : latestTurn?.question || "",
    latestAnswer: typeof thread?.latestAnswer === "string" ? thread.latestAnswer : latestTurn?.answer || "",
    createdAt,
    updatedAt: typeof thread?.updatedAt === "string" ? thread.updatedAt : latestTurn?.createdAt || createdAt,
  };
}

function hashString(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36);
}
