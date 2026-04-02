# AgenticAP — Streamlit → Next.js Migration Plan

**Target Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui  
**Deployment**: Docker-Compose-first, Vercel-compatible  
**Priority**: Phase 1 = Invoice List + Detail (core CRUD)  
**Date**: April 2026

---

## Table of Contents

1. [Architecture Shift — What Actually Changes](#1-architecture-shift)
2. [API Audit — Streamlit Queries vs. FastAPI Routes](#2-api-audit)
3. [Recommended Project Structure](#3-project-structure)
4. [Phase 0 — Backend Preparation (FastAPI)](#phase-0-backend-preparation)
5. [Phase 1 — Next.js Scaffold & Tooling](#phase-1-nextjs-scaffold)
6. [Phase 2 — Invoice List & Detail (PRIORITY)](#phase-2-invoice-list--detail)
7. [Phase 3 — Analytics Dashboard](#phase-3-analytics-dashboard)
8. [Phase 4 — File Upload & Processing](#phase-4-file-upload--processing)
9. [Phase 5 — Chatbot Tab](#phase-5-chatbot)
10. [Phase 6 — Cleanup & Cutover](#phase-6-cleanup--cutover)
11. [Docker & Deployment Strategy](#docker--deployment-strategy)
12. [Key Technical Decisions](#key-technical-decisions)
13. [Effort Estimates](#effort-estimates)

---

## 1. Architecture Shift

### What Changes

| Concern | Streamlit (Current) | Next.js (Target) |
|---|---|---|
| **DB Access** | Direct SQLAlchemy in `queries.py` | Zero — 100% via FastAPI REST |
| **Session State** | `st.session_state` (server-side) | React state + TanStack Query cache |
| **Rendering** | Server-side Python re-runs on every interaction | Client-side React with selective server components |
| **Charts** | Plotly (Python) | Recharts (React) |
| **PDF Preview** | streamlit-pdf-viewer | `react-pdf` or `<iframe>` |
| **Routing** | Single-page via sidebar | Next.js App Router (file-based) |
| **Auth** | None yet | NextAuth.js (maps to FastAPI-Users + JWT) |
| **Export** | ReportLab (Python) | Triggered via API, download blob in browser |

### What Does NOT Change

- **FastAPI backend** — zero changes to core logic
- **PostgreSQL + pgvector** — untouched
- **All AI/extraction/chatbot logic** — untouched
- **Docker Compose services** — you only ADD a `web` service
- **API schemas** (Pydantic) — these become your TypeScript types

---

## 2. API Audit

### Existing FastAPI Routes (confirmed from codebase)

| Streamlit Query | FastAPI Route | Status | Notes |
|---|---|---|---|
| `get_invoice_list()` | `GET /api/v1/invoices` | ✅ Exists | Needs `vendor`, `min_amount`, `max_amount`, `confidence`, `validation_status` query params |
| `get_invoice_detail()` | `GET /api/v1/invoices/{id}` | ✅ Exists | Includes extracted_data + validation_results |
| `process_invoice()` | `POST /api/v1/invoices/process` | ✅ Exists | — |
| `bulk_reprocess()` | `POST /api/v1/invoices/bulk/reprocess` | ✅ Exists | — |
| `export_csv` | — | ❌ Missing | Add `GET /api/v1/invoices/export/csv` |
| `export_pdf` | — | ❌ Missing | Add `GET /api/v1/invoices/{id}/export/pdf` |
| `get_status_distribution()` | `GET /api/v1/invoices/analytics/status-distribution` | ✅ Exists | — |
| `get_time_series_data()` | `GET /api/v1/invoices/analytics/time-series` | ✅ Exists | — |
| `get_vendor_analysis_data()` | `GET /api/v1/invoices/analytics/vendor-analysis` | ✅ Exists | — |
| `get_financial_summary_data()` | `GET /api/v1/invoices/analytics/financial-summary` | ✅ Exists | — |
| `chatbot_chat()` | `POST /api/v1/chatbot/chat` | ✅ Exists | — |
| `get_session()` | `GET /api/v1/chatbot/sessions/{id}` | ✅ Exists | — |
| File upload (new) | — | ❌ Missing | Add `POST /api/v1/invoices/upload` (multipart) |

### Action Items for Phase 0

1. Add `vendor`, `min_amount`, `max_amount`, `confidence`, `validation_status` as optional query params to `GET /api/v1/invoices`
2. Add `POST /api/v1/invoices/upload` for multipart file upload
3. Add `GET /api/v1/invoices/export/csv` (streaming response)
4. Add `GET /api/v1/invoices/{id}/export/pdf` (file response)
5. Configure CORS to allow `http://localhost:3000`

---

## 3. Project Structure

```
ai-einvoicing/
├── interface/
│   ├── api/                    ← FastAPI (unchanged)
│   ├── dashboard/              ← Streamlit (DELETE in Phase 6)
│   └── web/                    ← NEW: Next.js app
│       ├── app/
│       │   ├── layout.tsx              # Root layout (sidebar + topbar)
│       │   ├── page.tsx                # Redirect → /invoices
│       │   ├── invoices/
│       │   │   ├── page.tsx            # Invoice list
│       │   │   ├── loading.tsx         # Skeleton loader
│       │   │   └── [id]/
│       │   │       ├── page.tsx        # Invoice detail
│       │   │       └── loading.tsx
│       │   ├── analytics/
│       │   │   └── page.tsx
│       │   ├── upload/
│       │   │   └── page.tsx
│       │   └── chatbot/
│       │       └── page.tsx
│       ├── components/
│       │   ├── ui/                     # shadcn/ui components (auto-generated)
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopBar.tsx
│       │   │   └── PageHeader.tsx
│       │   ├── invoices/
│       │   │   ├── InvoiceTable.tsx    # TanStack Table
│       │   │   ├── InvoiceFilters.tsx  # Sidebar filters panel
│       │   │   ├── InvoiceStatusBadge.tsx
│       │   │   ├── InvoiceDetailPane.tsx
│       │   │   ├── ExtractedDataCard.tsx
│       │   │   ├── ValidationResults.tsx
│       │   │   ├── PDFViewer.tsx
│       │   │   └── BulkActionsBar.tsx
│       │   ├── analytics/
│       │   │   ├── StatusPieChart.tsx
│       │   │   ├── TimeSeriesChart.tsx
│       │   │   ├── VendorBarChart.tsx
│       │   │   └── FinancialSummaryCards.tsx
│       │   ├── upload/
│       │   │   └── DropZone.tsx
│       │   └── chatbot/
│       │       ├── ChatWindow.tsx
│       │       └── MessageBubble.tsx
│       ├── hooks/
│       │   ├── useInvoices.ts          # TanStack Query hooks
│       │   ├── useInvoiceDetail.ts
│       │   ├── useAnalytics.ts
│       │   └── useChatbot.ts
│       ├── lib/
│       │   ├── api-client.ts           # Axios instance
│       │   ├── types.ts                # TypeScript types (mirrors Pydantic)
│       │   └── utils.ts
│       ├── package.json
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── next.config.ts
```

---

## Phase 0 — Backend Preparation (FastAPI)

**Goal**: Make FastAPI ready to serve Next.js with zero gaps.  
**Estimated time**: 0.5–1 day

### Tasks

**P0.1 — CORS Update** (`interface/api/main.py`)
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",    # Next.js dev
        "http://localhost:3001",    # alternate
        os.getenv("FRONTEND_URL", ""),  # production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**P0.2 — Extend Invoice List Filtering** (`interface/api/routes/invoices.py`)
```python
@router.get("/invoices")
async def list_invoices(
    status: Optional[str] = None,
    vendor: Optional[str] = None,          # ADD
    min_amount: Optional[float] = None,    # ADD
    max_amount: Optional[float] = None,    # ADD
    confidence: Optional[float] = None,    # ADD
    validation_status: Optional[str] = None,  # ADD
    page: int = 1,
    page_size: int = 20,
    ...
```

**P0.3 — Add File Upload Endpoint**
```python
@router.post("/invoices/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    category: str = Form("Invoice"),
    group: str = Form("manual"),
):
    # Save to MinIO/local, then trigger processing
```

**P0.4 — Add CSV Export Endpoint**
```python
@router.get("/invoices/export/csv")
async def export_invoices_csv(
    status: Optional[str] = None,
    # ... same filters as list
):
    # Return StreamingResponse with CSV content
```

**P0.5 — Add PDF Export Endpoint**
```python
@router.get("/invoices/{invoice_id}/export/pdf")
async def export_invoice_pdf(invoice_id: UUID):
    # Return FileResponse with generated PDF
```

**P0.6 — Verify Health Endpoint returns version info**
```json
{ "status": "ok", "version": "0.x.x", "db": "connected" }
```

---

## Phase 1 — Next.js Scaffold & Tooling

**Goal**: Bootable, connected Next.js app with shared layout.  
**Estimated time**: 0.5 day

### Tasks

**P1.1 — Initialize Project**
```bash
cd interface/
npx create-next-app@latest web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
cd web
```

**P1.2 — Install Core Dependencies**
```bash
# shadcn/ui
npx shadcn@latest init

# Install essential shadcn components
npx shadcn@latest add button badge card table dialog sheet
npx shadcn@latest add input select checkbox dropdown-menu
npx shadcn@latest add skeleton toast tabs separator

# Data fetching & state
npm install @tanstack/react-query @tanstack/react-table
npm install axios

# Charts
npm install recharts

# PDF viewer
npm install react-pdf

# File upload
npm install react-dropzone

# Icons (already in shadcn)
npm install lucide-react

# Date utilities
npm install date-fns
```

**P1.3 — Create API Client** (`lib/api-client.ts`)
```typescript
import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// Auto-attach JWT when auth is added
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== "undefined"
    ? localStorage.getItem("access_token")
    : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

**P1.4 — Set Up TanStack Query Provider** (`app/providers.tsx`)
```typescript
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 2 },
    },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**P1.5 — Create TypeScript Types** (`lib/types.ts`)

Mirror every Pydantic schema from `interface/api/schemas.py`:

```typescript
export type InvoiceStatus =
  | "pending" | "queued" | "processing" | "completed" | "failed";

export interface Invoice {
  id: string;
  file_name: string;
  file_path: string;
  status: InvoiceStatus;
  category: string;
  group: string;
  confidence_score: number | null;
  processing_time: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  extracted_data?: ExtractedData;
  validation_results?: ValidationResult[];
}

export interface ExtractedData {
  id: string;
  invoice_id: string;
  vendor_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  line_items: LineItem[];
  raw_text: string | null;
}

export interface LineItem {
  description: string;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
}

export interface ValidationResult {
  id: string;
  rule_name: string;
  status: "passed" | "failed" | "warning";
  message: string;
  severity: "error" | "warning" | "info";
  suggested_action: string | null;
}

export interface PaginatedResponse<T> {
  status: string;
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  vendor?: string;
  min_amount?: number;
  max_amount?: number;
  confidence?: number;
  validation_status?: "all_passed" | "has_failed" | "has_warning";
  page?: number;
  page_size?: number;
}
```

**P1.6 — Build App Shell** (Sidebar + TopBar layout)

```
/invoices          → Invoice List
/invoices/[id]     → Invoice Detail
/analytics         → Analytics Dashboard
/upload            → File Upload
/chatbot           → Chatbot Interface
```

**P1.7 — Environment Config** (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=AgenticAP
```

---

## Phase 2 — Invoice List & Detail (PRIORITY)

**Goal**: Full feature parity with Streamlit invoice views.  
**Estimated time**: 2–3 days

### 2A — Invoice List Page

**Hooks** (`hooks/useInvoices.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Invoice, InvoiceFilters, PaginatedResponse } from "@/lib/types";

export function useInvoices(filters: InvoiceFilters) {
  return useQuery({
    queryKey: ["invoices", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResponse<Invoice>>(
        "/invoices",
        { params: filters }
      );
      return data;
    },
    placeholderData: (prev) => prev, // keeps old data while fetching new page
  });
}

export function useBulkReprocess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post("/invoices/bulk/reprocess", { invoice_ids: ids }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
  });
}
```

**InvoiceTable Component** (`components/invoices/InvoiceTable.tsx`)

Key features to implement:
- TanStack Table with column definitions:
  - File Name (truncated, with copy button)
  - Vendor (from extracted_data, nullable)
  - Invoice # (from extracted_data, nullable)
  - Total Amount (formatted with currency)
  - Status (colored badge)
  - Confidence Score (progress bar)
  - Processing Time
  - Date (relative: "2h ago")
  - Actions (View, Reprocess)
- Row click → navigate to `/invoices/[id]`
- Checkbox column for bulk selection
- Column sorting (client-side for current page)
- Pagination controls (server-side)

**InvoiceFilters Component** (`components/invoices/InvoiceFilters.tsx`)

Collapsible sidebar panel containing:
- Status multi-select (all statuses as checkboxes)
- Vendor name text input (debounced 300ms)
- Amount range (min/max number inputs)
- Confidence threshold (slider 0–100%)
- Validation status dropdown
- "Clear Filters" button
- Active filter count badge on toggle button

**BulkActionsBar Component** (`components/invoices/BulkActionsBar.tsx`)

Appears when ≥1 row is selected:
- "X invoices selected" label
- Bulk Reprocess button (with loading state)
- Force Reprocess checkbox
- Export CSV button (selected or all-filtered)
- Deselect All link

**InvoiceStatusBadge Component**
```typescript
const STATUS_CONFIG = {
  pending:    { label: "Pending",    class: "bg-slate-100 text-slate-700" },
  queued:     { label: "Queued",     class: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", class: "bg-amber-100 text-amber-700 animate-pulse" },
  completed:  { label: "Completed",  class: "bg-green-100 text-green-700" },
  failed:     { label: "Failed",     class: "bg-red-100 text-red-700" },
} as const;
```

**Export CSV Flow**
```typescript
const handleExportCSV = async () => {
  const response = await apiClient.get("/invoices/export/csv", {
    params: currentFilters,
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

### 2B — Invoice Detail Page

**Hook** (`hooks/useInvoiceDetail.ts`)
```typescript
export function useInvoiceDetail(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Invoice }>(`/invoices/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useReprocessInvoice(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/invoices/process", {
      file_path: ...,
      force_reprocess: true
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
```

**Layout**: Split-pane design  
- **Left pane (40%)**: PDF/image viewer via `react-pdf` or `<object>` tag
- **Right pane (60%)**: Scrollable data panels

**Right pane structure**:

```
┌─────────────────────────────────────────────┐
│  Header: filename + status badge + actions  │
│  [Reprocess] [Export PDF] [Back to List]    │
├─────────────────────────────────────────────┤
│  Card: Processing Info                      │
│  Confidence | Processing Time | Uploaded At │
├─────────────────────────────────────────────┤
│  Card: Extracted Data                       │
│  Vendor | Invoice # | Date | Due Date       │
│  Subtotal | Tax | Total | Currency          │
├─────────────────────────────────────────────┤
│  Card: Line Items Table                     │
│  Description | Qty | Unit Price | Total     │
├─────────────────────────────────────────────┤
│  Card: Validation Results                   │
│  Color-coded rows with severity + action    │
└─────────────────────────────────────────────┘
```

**ValidationResults Component** — key design points:
```typescript
const SEVERITY_CONFIG = {
  error:   { icon: XCircle,    class: "text-red-600",   bg: "bg-red-50" },
  warning: { icon: AlertTriangle, class: "text-amber-600", bg: "bg-amber-50" },
  info:    { icon: Info,       class: "text-blue-600",  bg: "bg-blue-50" },
};
// Shows: rule_name, status badge, message, suggested_action
// Collapsed by default if all passed, expanded if any failed
```

**PDFViewer Component** (`components/invoices/PDFViewer.tsx`)
```typescript
// Strategy: try react-pdf first, fall back to <iframe> for images
import { Document, Page } from "react-pdf";

// For images (JPG/PNG), render <img> directly
// For PDFs, use react-pdf Document/Page components
// Show page navigation for multi-page PDFs
```

---

## Phase 3 — Analytics Dashboard

**Goal**: Replace Streamlit Plotly charts with Recharts.  
**Estimated time**: 1–1.5 days

### Components

**StatusPieChart** (`components/analytics/StatusPieChart.tsx`)
```typescript
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
// Maps to GET /api/v1/invoices/analytics/status-distribution
// Colors match InvoiceStatusBadge
```

**TimeSeriesChart** (`components/analytics/TimeSeriesChart.tsx`)
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
// Maps to GET /api/v1/invoices/analytics/time-series
// Supports daily/weekly/monthly toggle
```

**VendorBarChart** (`components/analytics/VendorBarChart.tsx`)
```typescript
import { BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
// Maps to GET /api/v1/invoices/analytics/vendor-analysis
// Toggle: by count vs. by total amount
```

**FinancialSummaryCards** (`components/analytics/FinancialSummaryCards.tsx`)
```typescript
// 4-grid of KPI cards:
// Total Invoices | Total Amount | Avg Confidence | Failed Count
// Maps to GET /api/v1/invoices/analytics/financial-summary
```

---

## Phase 4 — File Upload & Processing

**Goal**: Drag-and-drop upload with real-time processing status.  
**Estimated time**: 1 day

### DropZone Component
```typescript
import { useDropzone } from "react-dropzone";

// Accepts: .pdf, .xlsx, .xls, .csv, .jpg, .jpeg, .png
// Shows: file preview, file name, size
// On drop: POST /api/v1/invoices/upload
// After upload: poll GET /api/v1/invoices/{id} until status = completed/failed
```

### Real-time Status Polling
```typescript
export function useInvoicePolling(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["invoice", id, "polling"],
    queryFn: () => apiClient.get(`/invoices/${id}`),
    enabled,
    refetchInterval: (data) => {
      const status = data?.data?.data?.status;
      // Stop polling when terminal state reached
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });
}
```

---

## Phase 5 — Chatbot

**Goal**: Chat interface using existing `/api/v1/chatbot` endpoints.  
**Estimated time**: 1 day

### Architecture

```typescript
// Session created on page load
// POST /api/v1/chatbot/sessions → store session_id in useState
// On send: POST /api/v1/chatbot/chat { message, session_id }
// Messages rendered with user/assistant roles
// "New Conversation" button → create new session
```

### ChatWindow Component
```
┌─────────────────────────────────────┐
│  [New Conversation]          [⚙️]   │
├─────────────────────────────────────┤
│                                     │
│  [User] How many invoices?          │
│                                     │
│         I found 42 invoices... [AI] │
│                                     │
│  [User] Show me failed ones         │
│                                     │
├─────────────────────────────────────┤
│  [Type your question...      ] [→]  │
│  Rate limit: 20/min  ●●●●●●○○○○    │
└─────────────────────────────────────┘
```

---

## Phase 6 — Cleanup & Cutover

**Goal**: Remove Streamlit, update docs and Docker.  
**Estimated time**: 0.5 day

### Tasks

1. **Delete Streamlit files**:
   ```bash
   rm -rf interface/dashboard/
   ```

2. **Remove Streamlit dependencies** (`pyproject.toml`):
   ```toml
   # Remove:
   # "streamlit>=1.39.0"
   # "streamlit-pdf-viewer"
   # "plotly>=5.18.0"
   # "reportlab>=4.0.0"
   ```

3. **Update `docker-compose.yml`** — see next section

4. **Update `README.md`** with new startup instructions

5. **Update any CI/CD scripts** that reference `streamlit run`

---

## Docker & Deployment Strategy

### docker-compose.yml — Add `web` Service

```yaml
services:
  db:
    image: pgvector/pgvector:pg15
    # ... existing config

  api:
    build: .
    command: uvicorn interface.api.main:app --host 0.0.0.0 --port 8000
    ports: ["8000:8000"]
    environment:
      - FRONTEND_URL=http://localhost:3000
    # ... existing config

  web:                                    # NEW SERVICE
    build:
      context: ./interface/web
      dockerfile: Dockerfile
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_URL=http://api:8000/api/v1
    depends_on:
      - api
    volumes:
      - ./interface/web:/app             # dev only
      - /app/node_modules
      - /app/.next
```

### Dockerfile for Next.js (`interface/web/Dockerfile`)
```dockerfile
# Development
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### Vercel Deployment (when ready)
```
# vercel.json at interface/web/
{
  "env": {
    "NEXT_PUBLIC_API_URL": "https://your-api-domain.com/api/v1"
  }
}
# Push interface/web/ as the Vercel project root
```

---

## Key Technical Decisions

### Why App Router (not Pages Router)?

- **Server Components** allow fetching invoice data on the server for initial page load (better SEO, faster TTFB)
- **Loading UI** (`loading.tsx`) gives instant skeleton screens
- **Parallel routes** could later support split-pane layouts natively
- The migration doc recommends it — it's the right call

### Why TanStack Query (not SWR or bare fetch)?

- You have bulk mutations with complex cache invalidation (reprocess → invalidate list + detail)
- Optimistic updates for status changes
- Background refetching for processing invoices
- Devtools for debugging during development

### Why TanStack Table (not AG Grid)?

- Headless — works seamlessly with shadcn/ui styling
- Server-side pagination model fits your `PaginatedResponse` API shape
- Free (AG Grid free tier has limitations for enterprise features)

### Real-time Processing Updates

Use **polling** for now (every 2s while processing). When/if you add WebSockets to FastAPI, update to `useWebSocket` without changing component logic.

### Auth Strategy

When you enable FastAPI-Users + JWT:
- Store `access_token` in `httpOnly` cookie (more secure) or `localStorage` (simpler)
- Use NextAuth.js with a custom credentials provider that calls `POST /auth/jwt/login`
- This is a drop-in addition — nothing in the data layer changes

---

## Effort Estimates

| Phase | Description | Effort | Blocker? |
|---|---|---|---|
| **Phase 0** | FastAPI audit + CORS + new endpoints | 0.5–1 day | Yes — must complete before Phase 2 |
| **Phase 1** | Next.js scaffold + tooling + types | 0.5 day | Yes — foundation |
| **Phase 2** | Invoice List + Detail (PRIORITY) | 2–3 days | No |
| **Phase 3** | Analytics Dashboard | 1–1.5 days | No |
| **Phase 4** | File Upload + processing | 1 day | No |
| **Phase 5** | Chatbot tab | 1 day | No |
| **Phase 6** | Cleanup + Docker | 0.5 day | No |
| **Total** | | **~7–9 days** | |

### Recommended Sprint Order

```
Week 1:  Phase 0 + Phase 1 + Phase 2 (Invoice List)
Week 2:  Phase 2 (Invoice Detail) + Phase 3 + Phase 4
Week 3:  Phase 5 + Phase 6 + testing + polish
```

---

## Quick-Start Checklist

Before writing a single React component, verify:

- [ ] `GET /api/v1/invoices` returns filtering params correctly
- [ ] CORS allows `http://localhost:3000`
- [ ] FastAPI returns consistent `{ status, data, pagination }` envelope on all list routes
- [ ] `GET /api/v1/invoices/{id}` includes `extracted_data` and `validation_results` in response
- [ ] `.env.local` created with `NEXT_PUBLIC_API_URL`
- [ ] `npx create-next-app` succeeds in `interface/web/`
- [ ] shadcn/ui initialized (`npx shadcn@latest init`)
- [ ] TanStack Query provider wrapping root layout

---

*Maintained by AgenticAP Team — update when phases complete or architecture changes.*
