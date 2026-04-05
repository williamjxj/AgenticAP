"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/invoices", label: "Invoices" },
  { href: "/upload", label: "Upload" },
  { href: "/chatbot", label: "Chatbot" },
  { href: "/quality", label: "Quality" },
  { href: "/ocr-compare", label: "OCR compare" },
] as const;

/**
 * App chrome: sidebar navigation + main content region (dual-UI alongside Streamlit).
 */
export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-1">
      <aside className="flex w-56 flex-col border-r border-border bg-muted/40">
        <div className="border-b border-border px-4 py-3">
          <span className="text-sm font-semibold tracking-tight">AI-Invoice</span>
          <p className="text-xs text-muted-foreground">Next.js UI</p>
        </div>
        <nav className="flex flex-col gap-0.5 p-2" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${
                  active ? "bg-muted font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border px-6 py-3">
          <p className="text-xs text-muted-foreground">
            API: <code className="rounded bg-muted px-1 py-0.5">{process.env.NEXT_PUBLIC_API_URL ?? "(default)"}</code>
          </p>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    </div>
  );
}
