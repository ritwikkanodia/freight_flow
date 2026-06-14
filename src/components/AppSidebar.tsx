"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/orders", label: "Orders", description: "Supplier workflow", icon: OrdersIcon },
  { href: "/loads", label: "Loads", description: "Execution workspace", icon: LoadsIcon },
  { href: "/loadboard", label: "Carrier Bids", description: "Inbound offers", icon: BidsIcon },
  { href: "/queries", label: "Queries", description: "Assistant log", icon: QueriesIcon },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className="border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
        <Link className="block w-36" href="/loads">
          <Image
            alt="Freight Flow"
            className="h-8 w-auto object-contain"
            height={31}
            src="/brand/freight-flow-logo-transparent.png"
            width={145}
          />
        </Link>
        <nav className="mt-3 flex gap-2 overflow-x-auto" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-gray-950 text-white"
                    : "bg-gray-50 text-gray-600 ring-1 ring-gray-200"
                }`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside
        className={`sticky top-0 hidden h-screen shrink-0 border-r border-gray-200 bg-white/95 px-2.5 py-4 shadow-[1px_0_0_rgba(15,23,42,0.02)] backdrop-blur transition-[width] duration-200 lg:block ${
          expanded ? "w-56" : "w-[72px]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <Link
            aria-label="Freight Flow home"
            className={`flex h-10 min-w-10 items-center rounded-lg transition ${expanded ? "px-1" : "justify-center"}`}
            href="/loads"
          >
            {expanded ? (
              <Image
                alt="Freight Flow"
                className="h-8 w-40 object-contain object-left"
                height={34}
                priority
                src="/brand/freight-flow-logo-transparent.png"
                width={160}
              />
            ) : (
              <LogoMark />
            )}
          </Link>
          {expanded && (
            <button
              aria-label="Collapse navigation"
              className="grid h-8 w-8 place-items-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => setExpanded(false)}
              type="button"
            >
              <CollapseIcon />
            </button>
          )}
        </div>

        {!expanded && (
          <button
            aria-label="Expand navigation"
            className="mt-3 grid h-9 w-full place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => setExpanded(true)}
            type="button"
          >
            <ExpandIcon />
          </button>
        )}

        <nav className="mt-5 space-y-1" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                aria-label={item.label}
                className={`group flex h-11 items-center rounded-lg transition ${
                  active
                    ? "bg-gray-950 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-950"
                } ${expanded ? "gap-3 px-3" : "justify-center px-0"}`}
                href={item.href}
                key={item.href}
                title={expanded ? undefined : item.label}
              >
                <Icon />
                {expanded && (
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span
                      className={`block truncate text-[11px] ${
                        active ? "text-gray-300" : "text-gray-400 group-hover:text-gray-500"
                      }`}
                    >
                      {item.description}
                    </span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`absolute bottom-4 left-2.5 right-2.5 ${expanded ? "" : "text-center"}`}>
          <div
            className={`rounded-lg border border-gray-200 bg-gray-50 text-gray-500 ${
              expanded ? "px-3 py-2" : "grid h-10 place-items-center"
            }`}
          >
            {expanded ? (
              <>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Mode</div>
                <div className="mt-0.5 text-xs font-medium text-gray-900">Broker ops</div>
              </>
            ) : (
              <span className="text-[10px] font-semibold">OPS</span>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

function LogoMark() {
  return (
    <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-white">
      <Image
        alt=""
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-8 w-[149px] max-w-none -translate-y-1/2 object-contain object-left"
        height={32}
        src="/brand/freight-flow-logo-transparent.png"
        width={149}
      />
    </span>
  );
}

function OrdersIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M7 3h10l2 3v15H5V6l2-3Z" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function LoadsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 17h11V7H4v10Z" />
      <path d="M15 10h3l2 3v4h-5" />
      <circle cx="7" cy="18" r="1.5" />
      <circle cx="17" cy="18" r="1.5" />
    </svg>
  );
}

function BidsIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 7h14" />
      <path d="M5 12h10" />
      <path d="M5 17h7" />
      <path d="m17 16 2 2 3-4" />
    </svg>
  );
}

function QueriesIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M5 5h14v10H8l-3 3V5Z" />
      <path d="M9 9h6" />
      <path d="M9 12h4" />
    </svg>
  );
}

function ExpandIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
