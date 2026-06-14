"use client";

import { useState } from "react";
import { Posting, formatUSD } from "@/lib/loads";

const PARTNER_STYLES: Record<Posting["partner"], { bg: string; text: string; abbr: string }> = {
  "Trucker Path": { bg: "bg-blue-600", text: "text-blue-600", abbr: "TP" },
  DAT: { bg: "bg-indigo-600", text: "text-indigo-600", abbr: "D" },
  Truckstop: { bg: "bg-emerald-600", text: "text-emerald-600", abbr: "TS" },
};

export function LoadPostings({ postings }: { postings: Posting[] }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
        ☑ Load Postings
        <span className="ml-auto text-xs font-normal text-gray-400">
          {postings.length} posting{postings.length === 1 ? "" : "s"}
        </span>
      </h2>
      <div className="space-y-3">
        {postings.map((p) => (
          <PostingRow key={p.referenceNo} posting={p} />
        ))}
      </div>
    </section>
  );
}

function PostingRow({ posting: p }: { posting: Posting }) {
  const [open, setOpen] = useState(p.status === "Posted");
  const partner = PARTNER_STYLES[p.partner];

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${partner.bg}`}
          title={p.partner}
        >
          {partner.abbr}
        </span>
        <span className="text-sm font-medium text-gray-900">
          Reference No: {p.referenceNo}
        </span>
        <PostStatus status={p.status} />
        <span className="ml-auto text-gray-400">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-3 text-sm">
          {p.comments && (
            <div>
              <div className="mb-1 font-semibold text-gray-900">Comments</div>
              <p className="text-gray-600">{p.comments}</p>
            </div>
          )}

          <Group title="Posting Information">
            <Row label="Price" value={p.price != null ? formatUSD(p.price) : "—"} />
            <Row
              label="Partner Name"
              value={<span className={partner.text}>{p.partner}</span>}
            />
            <Row label="Post ID" value={p.postId ?? "—"} />
            <Row label="Posted By" value={p.postedBy ?? "—"} />
            <Row label="Posted At" value={p.postedAt ?? "—"} />
            <Row label="Contact Methods" value={p.contactMethods ?? "—"} />
          </Group>

          {(p.unpostAfter || p.unpostedBy || p.unpostedAt) && (
            <Group title="Unpost Information">
              <Row label="Unpost After" value={p.unpostAfter ?? "—"} />
              <Row label="Unposted By" value={p.unpostedBy ?? "—"} />
              <Row label="Unposted At" value={p.unpostedAt ?? "—"} />
            </Group>
          )}

          {p.agent && (
            <Group title="Agent Information">
              <Row label="Name" value={p.agent.name} />
              <Row label="Primary Phone" value={p.agent.phone} />
              <Row label="Email" value={p.agent.email} />
            </Group>
          )}

          {p.status === "Unposted" && (
            <button className="w-full rounded-md border border-orange-500 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50">
              Post to Load Board
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PostStatus({ status }: { status: Posting["status"] }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        status === "Posted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
      }`}
    >
      {status}
    </span>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-semibold text-gray-900">{title}</div>
      <dl className="space-y-1.5">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
