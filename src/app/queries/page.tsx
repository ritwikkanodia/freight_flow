"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sanitizeQueryThreads } from "@/lib/queryLog.mjs";

type QueryThread = {
  id: string;
  title: string;
  latestQuestion: string;
  latestAnswer: string;
  createdAt: string;
  updatedAt: string;
  turns: {
    id: string;
    question: string;
    answer: string;
    links: { href: string; label: string }[];
    createdAt: string;
  }[];
};

const QUERY_LOG_KEY = "freight-flow:assistant-queries";

export default function QueriesPage() {
  const [queries, setQueries] = useState<QueryThread[]>([]);

  useEffect(() => {
    function refresh() {
      setQueries(sanitizeQueryThreads(readStoredLog()) as QueryThread[]);
    }

    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("freight-flow:assistant-query-log-updated", refresh);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("freight-flow:assistant-query-log-updated", refresh);
    };
  }, []);

  function clearQueries() {
    window.localStorage.removeItem(QUERY_LOG_KEY);
    setQueries([]);
    window.dispatchEvent(new CustomEvent("freight-flow:assistant-query-log-updated"));
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Assistant Queries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Conversation history from the floating assistant on this browser.
          </p>
        </div>
        <button
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:text-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={queries.length === 0}
          onClick={clearQueries}
          type="button"
        >
          Clear log
        </button>
      </div>

      {queries.length === 0 ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
          <div className="text-sm font-semibold text-gray-900">No assistant queries yet</div>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Ask the floating assistant about a load, supplier order, carrier bid, route, driver, tracking signal, or POD status.
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="text-sm font-semibold text-gray-900">
              {queries.length} conversation{queries.length === 1 ? "" : "s"}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">Newest first</div>
          </div>
          <div className="divide-y divide-gray-100">
            {queries.map((query) => (
              <article className="px-5 py-4" key={query.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Thread · {query.turns.length} turn{query.turns.length === 1 ? "" : "s"}
                    </div>
                    <h2 className="mt-1 text-base font-semibold text-gray-950">{query.title}</h2>
                    {query.latestQuestion && query.latestQuestion !== query.title && (
                      <p className="mt-1 text-sm text-gray-500">Latest: {query.latestQuestion}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-gray-500" dateTime={query.updatedAt}>
                    {formatTimestamp(query.updatedAt)}
                  </time>
                </div>
                <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm leading-6 text-gray-700">
                  {query.latestAnswer}
                </div>
                {query.turns.length > 1 && (
                  <div className="mt-3 space-y-2">
                    {query.turns.map((turn, index) => (
                      <details className="rounded-lg border border-gray-100 bg-white px-3 py-2" key={turn.id}>
                        <summary className="cursor-pointer text-xs font-semibold text-gray-600">
                          Turn {index + 1}: {turn.question}
                        </summary>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{turn.answer}</p>
                        <TurnLinks id={turn.id} links={turn.links} />
                      </details>
                    ))}
                  </div>
                )}
                {query.turns.length === 1 && <TurnLinks id={query.id} links={query.turns[0]?.links || []} />}
                {query.turns.length > 1 && (
                  <TurnLinks id={`${query.id}-latest`} links={query.turns[query.turns.length - 1]?.links || []} />
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TurnLinks({ id, links }: { id: string; links: { href: string; label: string }[] }) {
  if (links.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {links.map((link) => (
        <Link
          className="rounded-md bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100 hover:bg-orange-100"
          href={link.href}
          key={`${id}-${link.href}`}
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}

function readStoredLog() {
  try {
    return JSON.parse(window.localStorage.getItem(QUERY_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
