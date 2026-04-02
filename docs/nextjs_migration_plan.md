# Analysis & Implementation Plan: Migrating from Streamlit to Next.js

Replacing Streamlit with React.js/Next.js is a significant architectural upgrade that will transition the project from a tightly coupled data-science prototyping UI to a robust, scalable web application architecture. 

Below is an analysis of the implications and a concrete implementation plan to guide the transition.

## 1. Analysis of Implications

### Architectural Decoupling (The Biggest Change)
- **Current State:** The Streamlit application ([interface/dashboard/app.py](file:///Users/william.jiang/my-apps/ai-invoices/interface/dashboard/app.py)) directly connects to the PostgreSQL database using SQLAlchemy and executes queries (via [interface/dashboard/queries/main_queries.py](file:///Users/william.jiang/my-apps/ai-invoices/interface/dashboard/queries/main_queries.py)).
- **Target State (Next.js):** The frontend will execute in a Node.js environment (or browsers via client-side rendering) and will **completely lose direct database access**. It must rely entirely on the FastAPI backend for all data fetching and mutations. 
- **Impact:** You already have a strong start with `interface/api/routes` (`invoices.py`, `analytics.py`, `chatbot.py`), but an audit is required to ensure 100% of the queries made in Streamlit are available as REST APIs.

### State Management & Communication
- **Current State:** Streamlit handles session state natively on the server (`st.session_state`) and uses WebSockets under the hood for every interaction.
- **Target State (Next.js):** Next.js will depend on standard HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`). Client-side state will be managed by tools like React Server Components (RSC), React Context, or state management libraries (Zustand, Redux). Server-state caching and synchronization will be handled by tools like React Query, SWR, or Next.js's native `fetch` cache.

### UI/UX Capabilities & Performance
- **Impact:** Streamlit is rigid and can feel sluggish due to its server-roundtrip-on-interaction model. Next.js enables a drastically more responsive, native-feeling UI with highly customized designs (using Tailwind CSS, Shadcn UI, etc.). You can implement sophisticated features like optimistic UI updates, complex animations, and bespoke PDF viewers beside data forms.

### Infrastructure & Deployment
- **Impact:** Moving to Next.js means adding a separate service to your `docker-compose.yml`. You will need a Node.js Docker container for the Next.js server, instead of just running the `streamlit run` command alongside the Python API.

---

## 2. Concrete Implementation Plan

### Phase 1: Backend Audit & Preparation (Python/FastAPI)
*Goal: Ensure the REST API can fully support the new Next.js frontend.*
1. **Query Migration:** Audit `interface/dashboard/queries/main_queries.py` and `quality_metrics.py`. Map every query to an existing FastAPI route. For any missing functionality (e.g., complex filters, specific aggregations), create new endpoints.
2. **CORS Configuration:** Update `interface/api/main.py` to configure CORS middleware properly. Ensure it allows requests from `http://localhost:3000` (or whatever port Next.js runs on).
3. **Response Standardization:** Ensure all FastAPI routes return standardized JSON schemas using Pydantic models (which you seem to be already doing well).

### Phase 2: Next.js Boilerplate & Infrastructure (Node.js/Next.js)
*Goal: Setup the Next.js environment.*
1. **Initialize Next.js:** 
   ```bash
   npx create-next-app@latest interface/web --typescript --tailwind --eslint --app
   ```
2. **Setup Component Library:** Install Radix UI or shadcn/ui for accessible, unstyled components that integrate perfectly with Tailwind.
3. **Establish API Client:** Create an Axios instance or a native `fetch` wrapper in Next.js configured with the FastAPI base URL (`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`).
4. **Data Fetching Setup:** Integrate `@tanstack/react-query` or use Next.js App Router's built-in `fetch` for caching and server-side rendering API calls.

### Phase 3: Component Migration & UI Re-implementation
*Goal: Rebuild the features piece-by-piece.*
1. **App Shell & Layout:** Create the sidebar navigation, layout wrapper, and top-bar.
2. **Dashboard / Analytics:** Replace Streamlit charts by building React charts using a library like `Recharts` or `Chart.js`. Connect them to `/api/v1/analytics/*`.
3. **Invoices View:** Implement a robust data table implementation (e.g., using `@tanstack/react-table`) for the main invoice list. Connect it to `GET /api/v1/invoices`.
4. **Invoice Detail & File Processing:** Build the split-view where the PDF/Image is rendered on one side (using `react-pdf` or a simple `<iframe>` object tag), and the extracted data forms on the other.
5. **Upload Interface:** Implement drag-and-drop using `react-dropzone` and send `multipart/form-data` to `POST /api/v1/uploads`.
6. **Chatbot:** Create a chat conversational interface pinging `POST /api/v1/chatbot/chat`.

### Phase 4: Cleanup & Transition
*Goal: Remove legacy code.*
1. **Delete Streamlit Code:** Remove `interface/dashboard/` entirely.
2. **Dependency Cleanup:** Remove `streamlit` and `plotly` (if only used by Streamlit) from `pyproject.toml`.
3. **Docker Updates:** Update `docker-compose.yml` to include the new Next.js service.
4. **Script Updates:** Update `./bin/dashboard.sh` or create a new `./bin/web.sh` to handle `npm run dev` or `npm start`.

---

## 3. Recommended Tech Stack for the Next.js App

For the easiest transition and most modern DX (Developer Experience), I recommend:
* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Components:** Shadcn/ui (Radix CLI)
* **Data Fetching:** TanStack React Query (simplifies async state management)
* **Tables:** TanStack Table (headless, ultimate flexibility)
* **Icons:** Lucide React
* **Charts:** Recharts
