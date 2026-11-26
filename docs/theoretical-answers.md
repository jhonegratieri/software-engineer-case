# Part 1 – Theoretical Questions

## 1. ReactJS and Next.js: rendering and strategies

### a) CSR vs SSR vs SSG

The three strategies differ in **where** and **when** the HTML for a page is produced.

- **Client-Side Rendering (CSR)**:
  - **How it works:** the server sends an almost empty HTML document plus a JavaScript bundle. The browser downloads and runs the JavaScript, fetches the data (usually from an API) and only then builds the page.
  - **Rendering location:** all rendering happens in the browser, on every visit.
  - **Example:** a classic `create-react-app` / Vite SPA.
- **Server-Side Rendering (SSR)**:
  - **How it works:** for **every request**, the server fetches the data, renders the components to HTML and sends a complete page. The browser then shows content immediately and "hydrates" it, attaching React's event handlers so the page becomes interactive.
  - **Rendering location:** HTML is produced on the server at request time.
  - **Example:** in the Next.js App Router, a dynamic server component (`export const dynamic = "force-dynamic"`, or one that reads cookies/headers).
- **Static Site Generation (SSG)**:
  - **How it works:** the HTML is rendered **once, at build time**, and served as static files, usually from a CDN. Every visitor gets the same pre-built page until the next build.
  - **Rendering location:** the server or build machine, ahead of any request.
  - **Variant:** Next.js also offers Incremental Static Regeneration (ISR, `revalidate`), which regenerates static pages in the background after a given time or on demand.

In short: CSR renders in the browser on every visit, SSR renders on the server on every request, and SSG renders ahead of time, once per build or revalidation.

### b) When each approach helps or hurts

**CSR**
- **Advantages:**
  - Cheap to host (static files only).
  - Very fluid after the first load.
  - The server does no rendering work.
- **Problems:**
  - Slow first meaningful paint on weak devices or slow networks: a blank page or spinners while JS loads, then a "waterfall" of data requests.
  - Weak SEO and link previews, because crawlers and social media bots may see an empty page.
- **Good fit:** pages behind a login where SEO does not matter and users stay for a long session, e.g. an internal admin dashboard, a spreadsheet-like tool or a design editor.
- **Bad fit:** a public marketing page or a product catalog.

**SSR**
- **Advantages:**
  - Fast first content.
  - Good SEO.
  - Data is always fresh and can be personalized per user.
  - Secrets and heavy dependencies stay on the server.
- **Problems:**
  - Every request costs server CPU and must wait for the data sources, so a slow database means a slow TTFB.
  - Needs a running server, which makes it harder and more expensive to scale than a CDN.
  - Hydration mismatches can appear when the server and the client render differently (dates, time zones, `Math.random`).
- **Good fit:**
  - A logged-in feed.
  - Search results.
  - A product page with live stock and price.
  - The task list in this project, because its data changes at runtime and must be current on every request.
- **Bad fit:** pages that are identical for everyone and rarely change, where SSR just wastes compute.

**SSG**
- **Advantages:**
  - Fastest possible delivery (pre-built HTML from a CDN).
  - Cheap.
  - Very resilient: there is no server or database at request time.
  - Excellent SEO.
- **Problems:**
  - Content becomes stale until the next build or revalidation.
  - Build time grows with the number of pages (e.g. 100k product pages).
  - Cannot personalize per user at render time.
- **Good fit:** documentation sites, blogs, landing pages, marketing pages.
- **Mitigation:** ISR solves part of the staleness, e.g. an e-commerce catalog regenerated every few minutes.
- **Bad fit:** a bank statement or a chat.

In practice, modern Next.js mixes them per route, and even per component:
- static shells,
- server-rendered sections streamed with Suspense,
- client components only where interactivity is needed.

## 2. Backend: concepts and approaches

### a) Main ways to implement a backend for a web application

There are two axes: the architecture style, and the API style the frontend talks to.

**Architecture / hosting**
- **Monolith:** a single deployable server application, e.g. Express/Fastify/NestJS in Node.js, Django, Rails, Spring Boot, ASP.NET. It is the simplest to build, test and deploy, and it is usually the right starting point.
- **Microservices:** several independently deployed services communicating over HTTP, gRPC or a message broker such as Kafka or RabbitMQ.
  - **Advantages:** independent scaling and team ownership.
  - **Cost:** operational complexity, network failures, distributed data.
- **Serverless functions:** AWS Lambda, Google Cloud Functions, Vercel Functions.
  - **Advantages:** no servers to manage and scale-to-zero pricing.
  - **Costs:** cold starts, execution limits, and state that must live elsewhere.
- **Full-stack frameworks:** the backend lives in the same project as the frontend, e.g. Next.js Route Handlers and Server Actions, Remix loaders/actions, SvelteKit. This works well for "backend for frontend" needs.
- **Backend-as-a-Service:** Firebase or Supabase provide database, auth, storage and realtime with little custom code. You trade flexibility and portability for speed.

**API style**
- **REST:**
  - Resources plus HTTP verbs.
  - Universal, cacheable and easy for any client to consume.
  - Usually described with OpenAPI.
- **GraphQL:**
  - A single endpoint with a typed schema, where the client chooses the fields.
  - Great for many clients with different data needs.
  - Harder caching, plus complexity and query-cost concerns.
- **RPC:**
  - The client calls remote functions.
  - Variants: **tRPC** (TypeScript end to end) and **gRPC** (Protocol Buffers, fast, polyglot, mostly service-to-service).
- **Realtime:** WebSockets and Server-Sent Events, for chat, notifications and live dashboards.

### b) tRPC: advantages and disadvantages

Yes. tRPC lets a TypeScript backend expose **procedures** (queries and mutations). The client imports only the router's **type**, so calling the backend feels like calling a typed function. There is no schema file and no code generation. This project uses it.

**Typing**
- **Advantages:**
  - End-to-end type safety through inference: renaming a field or changing an input breaks the frontend build immediately.
  - Autocomplete for every procedure, input and output.
  - Combined with zod, the same schema both validates the input at runtime and produces the static type.
- **Disadvantages:**
  - Only works when client and server are both TypeScript, ideally in the same repository or monorepo.
  - The type guarantee is **compile-time only**: without runtime validation (zod), malicious or outdated clients can still send anything.
  - Very large routers can slow down the TypeScript language server.

**Security**
- **Points in favour:**
  - Input validation is built into the procedure definition, so it is hard to forget.
  - Middlewares make it simple to create `protectedProcedure`s that check authentication and authorization in one place.
  - Error formatting can control what reaches the client.
- **Points of attention:**
  - Every procedure is still a **public HTTP endpoint**. tRPC is not a security layer: authentication, authorization per resource, rate limiting and CSRF protection for cookie-based auth remain your responsibility.
  - It is easy to accidentally leak internal fields by returning a whole database object, since the output is not filtered unless you add an output schema.
  - Request batching means one HTTP request can trigger many procedures, which should be considered in rate limiting.

**Scalability**
- **Points in favour:**
  - It is plain HTTP and stateless, so it scales horizontally like any API and runs on servers or serverless.
  - Batching reduces round-trips.
  - The TanStack Query integration provides caching, deduplication and SSR prefetching.
- **Limitations:**
  - It is **not a good public API**: third parties, mobile apps written in other languages, or other teams' services do not get the types. There is no standard contract like OpenAPI or GraphQL SDL (adapters exist, but they are add-ons).
  - Tight coupling between frontend and backend makes independent versioning harder. Breaking changes must be deployed together, or carefully kept backwards compatible.
  - HTTP and CDN caching is less natural than with REST resources.

**Summary:**
- **Excellent for** a full-stack TypeScript application with one team owning both sides (exactly the scenario of this case): fast development and very few integration bugs.
- **Better alternatives** when the API must serve many heterogeneous consumers or be published externally: REST/OpenAPI, GraphQL or gRPC.
