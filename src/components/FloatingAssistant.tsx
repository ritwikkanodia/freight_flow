"use client";

import Link from "next/link";
import { FormEvent, MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import { appendThreadTurn, createQueryThread, sanitizeQueryThreads, upsertQueryThread } from "@/lib/queryLog.mjs";

type AssistantLink = {
  href: string;
  label: string;
};

type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: AssistantLink[];
};

type QueryThread = {
  id: string;
  title: string;
  turns: {
    id: string;
    question: string;
    answer: string;
    links: AssistantLink[];
    createdAt: string;
  }[];
  latestQuestion: string;
  latestAnswer: string;
  createdAt: string;
  updatedAt: string;
};

const QUERY_LOG_KEY = "freight-flow:assistant-queries";

const STARTERS = [
  "What bids does load 236556 have?",
  "Show me SO-153241",
  "When can delivery be marked complete?",
];

export function FloatingAssistant() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "assistant-welcome",
      role: "assistant",
      text: "Ask about any order, load, bid, route, driver, tracking update, or POD status in Freight Flow.",
    },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageCounterRef = useRef(0);
  const threadRef = useRef<QueryThread | null>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const lastAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant"),
    [messages],
  );

  async function submitQuestion(nextQuestion = question) {
    const trimmed = nextQuestion.trim();
    if (!trimmed || busy) return;

    const userMessage: AssistantMessage = {
      id: nextMessageId(messageCounterRef, "user"),
      role: "user",
      text: trimmed,
    };
    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setBusy(true);

    try {
      const response = await fetch("/api/system-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const payload = await response.json();
      const answerText = response.ok ? payload.text : payload.error || "Unable to answer that question.";
      const links = response.ok && Array.isArray(payload.links) ? payload.links : [];
      const assistantMessage: AssistantMessage = {
        id: nextMessageId(messageCounterRef, "assistant"),
        role: "assistant",
        text: answerText,
        links,
      };

      setMessages((current) => [...current, assistantMessage]);
      persistQueryThread(threadRef, trimmed, answerText, links);
    } catch {
      const errorText = "Assistant service is unavailable. Check the local backend and try again.";
      setMessages((current) => [
        ...current,
        { id: nextMessageId(messageCounterRef, "assistant"), role: "assistant", text: errorText },
      ]);
      persistQueryThread(threadRef, trimmed, errorText, []);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion();
  }

  function handleStarter(starter: string) {
    setOpen(true);
    void submitQuestion(starter);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
      {open && (
        <section className="w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-gray-950/15">
          <header className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-950">Ask Freight Flow</div>
              <div className="text-xs text-gray-500">Orders, loads, bids, routes, tracking, POD</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-950"
                href="/queries"
              >
                Queries
              </Link>
              <button
                aria-label="Close assistant"
                className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-950"
                onClick={() => setOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
          </header>

          <div className="max-h-[420px] space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((message) => (
              <div
                className={`rounded-lg px-3 py-2 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-10 bg-gray-950 text-white"
                    : "mr-8 border border-gray-100 bg-gray-50 text-gray-700"
                }`}
                key={message.id}
              >
                <div>{message.text}</div>
                {message.links && message.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.links.map((link) => (
                      <Link
                        className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 hover:bg-orange-50"
                        href={link.href}
                        key={`${message.id}-${link.href}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="mr-8 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                Looking through workspace data...
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-3">
            <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
              {STARTERS.map((starter) => (
                <button
                  className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-950 disabled:opacity-50"
                  disabled={busy}
                  key={starter}
                  onClick={() => handleStarter(starter)}
                  type="button"
                >
                  {starter}
                </button>
              ))}
            </div>
            <form className="flex items-center gap-2" onSubmit={handleSubmit}>
              <input
                className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                disabled={busy}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask about any load, bid, order, driver..."
                ref={inputRef}
                value={question}
              />
              <button
                aria-label="Ask assistant"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gray-950 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                disabled={!question.trim() || busy}
                type="submit"
              >
                <SendIcon />
              </button>
            </form>
          </div>
        </section>
      )}

      {!open && lastAssistantMessage && (
        <button
          className="hidden max-w-xs rounded-xl border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-600 shadow-lg shadow-gray-950/10 hover:border-gray-300 sm:block"
          onClick={() => setOpen(true)}
          type="button"
        >
          <span className="block font-semibold text-gray-950">Ask Freight Flow</span>
          <span className="mt-0.5 line-clamp-2 block">{lastAssistantMessage.text}</span>
        </button>
      )}

      <button
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="grid h-12 w-12 place-items-center rounded-full bg-gray-950 text-white shadow-xl shadow-gray-950/20 transition hover:-translate-y-0.5 hover:bg-gray-800"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <SparkIcon />
      </button>
    </div>
  );
}

function nextMessageId(counterRef: MutableRefObject<number>, prefix: string) {
  counterRef.current += 1;
  return `${prefix}-${counterRef.current}`;
}

function persistQueryThread(
  threadRef: MutableRefObject<QueryThread | null>,
  question: string,
  answer: string,
  links: AssistantLink[],
) {
  if (typeof window === "undefined") return;

  if (!threadRef.current) {
    threadRef.current = createQueryThread({ title: question }) as QueryThread;
  }

  threadRef.current = appendThreadTurn(threadRef.current, { question, answer, links }) as QueryThread;

  const current = sanitizeQueryThreads(readStoredLog());
  window.localStorage.setItem(QUERY_LOG_KEY, JSON.stringify(upsertQueryThread(current, threadRef.current)));
  window.dispatchEvent(new CustomEvent("freight-flow:assistant-query-log-updated"));
}

function readStoredLog() {
  try {
    return JSON.parse(window.localStorage.getItem(QUERY_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

function SparkIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m22 2-7 20-4-9-9-4 20-7Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
